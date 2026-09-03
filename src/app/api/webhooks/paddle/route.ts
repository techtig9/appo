import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  verifyPaddleSignature,
  mapPaddleEventToSubscriptionUpdate,
  resolveCreditsRemaining,
  webhookIdempotencyKey,
  type PaddleWebhookEvent,
} from "@/lib/paddle";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1_000_000;

/**
 * Paddle is the authority on subscription state — this handler is the only
 * thing that moves a user between plans. It therefore has to be exactly
 * once per event and must never trust anything it has not verified.
 *
 * Responses are deliberately terse: Paddle only needs 2xx (stop retrying)
 * or non-2xx (retry). Detail goes to logs, not to the response body.
 */
export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const signature = req.headers.get("Paddle-Signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!secret) {
    // Refusing (rather than accepting unverified events) is the safe
    // failure mode: Paddle retries, and a misconfigured deploy cannot be
    // used to grant plans by posting forged JSON.
    logger.error("Paddle webhook received but PADDLE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (!signature || !verifyPaddleSignature(rawBody, signature, secret)) {
    logger.warn("Paddle webhook rejected: invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaddleWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PaddleWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event?.event_type || !event?.data?.id) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  // Keyed on the DELIVERY id, not the subject id. See the comment on
  // webhookIdempotencyKey — using data.id here caused paid upgrades to be
  // discarded as duplicates of the signup event.
  const eventKey = webhookIdempotencyKey(event);
  const supabase = createServiceRoleClient();

  const { error: eventError } = await supabase.from("paddle_webhook_events").insert({
    event_id: eventKey,
    event_type: event.event_type,
    subject_id: event.data.id,
    occurred_at: event.occurred_at ?? null,
    status: "received",
  });

  if (eventError) {
    if (eventError.code === "23505") {
      const { data: existing } = await supabase
        .from("paddle_webhook_events")
        .select("processed_at, status")
        .eq("event_id", eventKey)
        .maybeSingle();

      if (existing?.processed_at || existing?.status === "processed" || existing?.status === "ignored") {
        logger.info("Paddle webhook duplicate ignored", { eventType: event.event_type, eventKey });
        return NextResponse.json({ received: true, applied: false, duplicate: true });
      }
      // A previous attempt died mid-flight; fall through and retry it.
    } else {
      logger.error("Paddle webhook persistence failed", { eventType: event.event_type, error: eventError });
      return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });
    }
  }

  // Read the stored plan first so `subscription.updated` can tell a real
  // plan change (reissue credits) from an administrative edit (leave the
  // balance alone).
  const { data: currentSubscription } = await supabase
    .from("subscriptions")
    .select("plan, credits_remaining")
    .eq("user_id", event.data.custom_data?.user_id ?? "")
    .maybeSingle();

  const update = mapPaddleEventToSubscriptionUpdate(event, currentSubscription?.plan);

  if (!update) {
    // An event Appo does not act on (or one missing custom_data). Record it
    // as ignored so a retry is not treated as unprocessed work.
    await supabase
      .from("paddle_webhook_events")
      .update({ status: "ignored", processed_at: new Date().toISOString() })
      .eq("event_id", eventKey);
    logger.info("Paddle webhook ignored (no mapping)", { eventType: event.event_type, eventKey });
    return NextResponse.json({ received: true, applied: false });
  }

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .update({
      plan: update.plan,
      status: update.status,
      credits_remaining: resolveCreditsRemaining(update, currentSubscription?.credits_remaining ?? 0),
      credits_granted: update.creditsGranted,
      paddle_subscription_id: update.paddleSubscriptionId,
      paddle_customer_id: update.paddleCustomerId,
    })
    .eq("user_id", update.userId);

  if (subscriptionError) {
    await supabase
      .from("paddle_webhook_events")
      .update({ status: "failed", error_detail: subscriptionError.message.slice(0, 400) })
      .eq("event_id", eventKey);
    logger.error("Paddle subscription update failed", { eventKey, userId: update.userId, error: subscriptionError });
    // 500 so Paddle retries — the customer's plan must not silently diverge.
    return NextResponse.json({ error: "Subscription update failed" }, { status: 500 });
  }

  if (event.event_type === "transaction.payment_failed") {
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: update.userId,
      paddle_transaction_id: event.data.id,
      status: "failed",
    });
    if (paymentError && paymentError.code !== "23505") {
      await supabase
        .from("paddle_webhook_events")
        .update({ status: "failed", error_detail: paymentError.message.slice(0, 400) })
        .eq("event_id", eventKey);
      return NextResponse.json({ error: "Payment event persistence failed" }, { status: 500 });
    }
  }

  await Promise.all([
    notify(supabase, notificationFor(event.event_type, update.plan, update.userId)),
    recordAudit(supabase, {
      userId: update.userId,
      action: event.event_type === "transaction.payment_failed" ? "billing.payment_failed" : "billing.subscription_changed",
      resourceType: "subscription",
      resourceId: update.paddleSubscriptionId,
      metadata: { eventType: event.event_type, plan: update.plan, status: update.status },
    }),
  ]);

  const { error: processedError } = await supabase
    .from("paddle_webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("event_id", eventKey);

  if (processedError) {
    // The business change already landed. Returning 500 would make Paddle
    // retry, but the retry is safe: the subscription update is idempotent
    // and this row will be marked processed on the way through.
    logger.error("Paddle webhook completion write failed", { eventKey, error: processedError });
    return NextResponse.json({ error: "Webhook completion persistence failed" }, { status: 500 });
  }

  logger.info("Paddle webhook applied", { eventType: event.event_type, eventKey, plan: update.plan });
  return NextResponse.json({ received: true, applied: true });
}

function notificationFor(
  eventType: PaddleWebhookEvent["event_type"],
  plan: string,
  userId: string
): Parameters<typeof notify>[1] {
  switch (eventType) {
    case "subscription.created":
      return {
        userId,
        category: "billing",
        title: `Your ${plan} plan is active`,
        body: "Your credits have been topped up for the new billing period.",
        href: "/dashboard/billing",
        severity: "success",
      };
    case "subscription.updated":
      return {
        userId,
        category: "billing",
        title: `Subscription updated to ${plan}`,
        body: "Your plan and monthly credit allowance have been adjusted.",
        href: "/dashboard/billing",
        severity: "info",
      };
    case "subscription.canceled":
      return {
        userId,
        category: "billing",
        title: "Subscription cancelled",
        body: "Your account has moved to the Free plan. Your projects are unaffected.",
        href: "/dashboard/billing",
        severity: "warning",
      };
    case "transaction.payment_failed":
    default:
      return {
        userId,
        category: "billing",
        title: "Payment failed",
        body: "We couldn't take your last payment. Update your payment method to restore your plan.",
        href: "/dashboard/billing",
        severity: "error",
      };
  }
}
