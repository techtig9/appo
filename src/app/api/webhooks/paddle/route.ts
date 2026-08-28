import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyPaddleSignature, mapPaddleEventToSubscriptionUpdate, type PaddleWebhookEvent } from "@/lib/paddle";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const signature = req.headers.get("Paddle-Signature");
  const secret = process.env.PADDLE_WEBHOOK_SECRET;

  if (!signature || !secret || !verifyPaddleSignature(rawBody, signature, secret)) {
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

  const supabase = createServiceRoleClient();

  // Idempotency: Paddle may retry the same event. Record the event before
  // applying its side effects so a duplicate is acknowledged safely.
  const { error: eventError } = await supabase
    .from("paddle_webhook_events")
    .insert({ event_id: event.data.id, event_type: event.event_type });

  if (eventError) {
    if (eventError.code === "23505") {
      const { data: existing } = await supabase
        .from("paddle_webhook_events")
        .select("processed_at")
        .eq("event_id", event.data.id)
        .maybeSingle();
      if (existing?.processed_at) {
        return NextResponse.json({ received: true, applied: false, duplicate: true });
      }
      // A prior attempt failed before completion; continue so the event can be retried.
    } else {
      return NextResponse.json({ error: "Webhook persistence failed" }, { status: 500 });
    }
  }

  const update = mapPaddleEventToSubscriptionUpdate(event);

  if (!update) {
    await supabase
      .from("paddle_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.data.id);
    return NextResponse.json({ received: true, applied: false });
  }

  const { error: subscriptionError } = await supabase
    .from("subscriptions")
    .update({
      plan: update.plan,
      status: update.status,
      credits_remaining: update.creditsRemaining,
      paddle_subscription_id: update.paddleSubscriptionId,
      paddle_customer_id: update.paddleCustomerId,
    })
    .eq("user_id", update.userId);

  if (subscriptionError) {
    return NextResponse.json({ error: "Subscription update failed" }, { status: 500 });
  }

  if (event.event_type === "transaction.payment_failed") {
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: update.userId,
      paddle_transaction_id: event.data.id,
      status: "failed",
    });
    if (paymentError && paymentError.code !== "23505") {
      return NextResponse.json({ error: "Payment event persistence failed" }, { status: 500 });
    }
  }

  const { error: processedError } = await supabase
    .from("paddle_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("event_id", event.data.id);

  if (processedError) {
    return NextResponse.json({ error: "Webhook completion persistence failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, applied: true });
}
