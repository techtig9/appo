import { createHmac, timingSafeEqual } from "node:crypto";
import { PLANS } from "./plans";
import type { PlanId } from "./supabase/types";

/**
 * Paddle Billing signs webhooks as `Paddle-Signature: ts=<unix>;h1=<hex-hmac>`.
 * The signed payload is `${ts}:${rawBody}`, HMAC-SHA256'd with the webhook
 * secret. This is pure and needs no network access, so it's fully unit
 * testable offline.
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => {
      const [k, v] = kv.split("=");
      return [k, v];
    })
  );

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1 || !/^\d+$/.test(ts)) return false;

  // Reject stale webhook signatures to prevent replay attacks.
  const timestamp = Number(ts);
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(h1, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;

  return timingSafeEqual(expectedBuf, actualBuf);
}

export type PaddleEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "subscription.paused"
  | "subscription.resumed"
  | "transaction.completed"
  | "transaction.payment_failed";

export interface PaddleWebhookEvent {
  /**
   * Paddle Billing's per-delivery identifier (`evt_...`). This — NOT
   * `data.id` — is what makes a webhook idempotent. `data.id` is the id of
   * the *subject* (the subscription or transaction), so it repeats across
   * every event about that subject.
   */
  event_id?: string;
  event_type: PaddleEventType;
  occurred_at?: string;
  data: {
    id: string;
    customer_id: string;
    status?: string;
    items?: { price?: { name?: string } }[];
    custom_data?: { user_id?: string; plan?: PlanId };
  };
}

/**
 * Derives the idempotency key for a webhook delivery.
 *
 * The previous implementation used `event.data.id` as the primary key of
 * `paddle_webhook_events`. For subscription events that is the SUBSCRIPTION
 * id, which is identical for `subscription.created` and every later
 * `subscription.updated`. The result: a customer's paid upgrade arrived,
 * collided with the row written at signup, and was dropped as a
 * "duplicate" — they were billed for a plan that was never applied.
 *
 * Paddle always sends `event_id`. The fallback composite is only for
 * malformed or replayed payloads that omit it, and still distinguishes
 * different event types and occurrence times for the same subject.
 */
export function webhookIdempotencyKey(event: PaddleWebhookEvent): string {
  if (event.event_id && /^[A-Za-z0-9_-]{1,200}$/.test(event.event_id)) return event.event_id;
  return `${event.event_type}:${event.data.id}:${event.occurred_at ?? "unknown"}`;
}

/**
 * How an event should affect the credit balance.
 *
 * "grant"    — start of a new entitlement period: set the balance to the
 *              plan's monthly allowance.
 * "preserve" — administrative change (payment method, next billing date,
 *              a resume). Leave the balance alone.
 * "freeze"   — payment failed or the subscription is paused: zero the
 *              balance so usage stops until it is resolved.
 *
 * The distinction matters because Paddle emits `subscription.updated` for
 * many non-billing reasons. Treating every one of them as a renewal — as
 * the previous mapping did — handed a customer a full month of credits
 * every time they updated their card.
 */
export type CreditPolicy = "grant" | "preserve" | "freeze";

export interface SubscriptionUpdate {
  userId: string;
  plan: PlanId;
  status: "active" | "cancelled" | "past_due" | "paused";
  /** The plan's monthly allowance — written to credits_granted. */
  creditsGranted: number;
  creditPolicy: CreditPolicy;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
}

/**
 * Pure mapping from a verified Paddle event to the subscription row update
 * the webhook route should apply. Kept separate from the actual Supabase
 * write so the mapping logic can be unit tested without a database.
 */
export function mapPaddleEventToSubscriptionUpdate(
  event: PaddleWebhookEvent,
  /** The plan currently stored for this user, when the caller knows it. */
  currentPlan?: PlanId
): SubscriptionUpdate | null {
  const userId = event.data.custom_data?.user_id;
  const plan = event.data.custom_data?.plan;
  if (!userId || !plan || !PLANS[plan]) return null;

  const base = {
    userId,
    paddleSubscriptionId: event.data.id,
    paddleCustomerId: event.data.customer_id,
  };

  switch (event.event_type) {
    case "subscription.created":
      return { ...base, plan, status: "active", creditsGranted: PLANS[plan].monthlyCredits, creditPolicy: "grant" };

    case "transaction.completed":
      // A completed transaction is the renewal signal: money changed hands
      // for a new period, so the allowance is reissued.
      return { ...base, plan, status: "active", creditsGranted: PLANS[plan].monthlyCredits, creditPolicy: "grant" };

    case "subscription.updated": {
      // Only a genuine plan change reissues credits. When the caller
      // could not tell us the stored plan we fall back to "grant" on a
      // changed plan and "preserve" otherwise — never a blanket reset.
      const planChanged = currentPlan !== undefined && currentPlan !== plan;
      return {
        ...base,
        plan,
        status: "active",
        creditsGranted: PLANS[plan].monthlyCredits,
        creditPolicy: planChanged ? "grant" : "preserve",
      };
    }

    case "subscription.resumed":
      return { ...base, plan, status: "active", creditsGranted: PLANS[plan].monthlyCredits, creditPolicy: "preserve" };

    case "subscription.paused":
      return { ...base, plan, status: "paused", creditsGranted: PLANS[plan].monthlyCredits, creditPolicy: "freeze" };

    case "subscription.canceled":
      return {
        ...base,
        plan: "free",
        status: "cancelled",
        creditsGranted: PLANS.free.monthlyCredits,
        creditPolicy: "grant",
      };

    case "transaction.payment_failed":
      return { ...base, plan, status: "past_due", creditsGranted: PLANS[plan].monthlyCredits, creditPolicy: "freeze" };

    default:
      return null;
  }
}

/**
 * Applies a credit policy to the balance already on the account. Pure, so
 * the "an admin card update must not refill credits" rule is directly
 * testable.
 */
export function resolveCreditsRemaining(update: SubscriptionUpdate, currentCreditsRemaining: number): number {
  switch (update.creditPolicy) {
    case "grant":
      return update.creditsGranted;
    case "freeze":
      return 0;
    case "preserve":
      // Clamp: a downgrade must not leave a balance above the new plan's
      // allowance.
      return Math.max(0, Math.min(currentCreditsRemaining, update.creditsGranted));
  }
}
