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
  | "transaction.payment_failed";

export interface PaddleWebhookEvent {
  event_type: PaddleEventType;
  data: {
    id: string;
    customer_id: string;
    status?: string;
    items?: { price?: { name?: string } }[];
    custom_data?: { user_id?: string; plan?: PlanId };
  };
}

export interface SubscriptionUpdate {
  userId: string;
  plan: PlanId;
  status: "active" | "cancelled" | "past_due";
  creditsRemaining: number;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
}

/**
 * Pure mapping from a verified Paddle event to the subscription row update
 * the webhook route should apply. Kept separate from the actual Supabase
 * write so the mapping logic can be unit tested without a database.
 */
export function mapPaddleEventToSubscriptionUpdate(event: PaddleWebhookEvent): SubscriptionUpdate | null {
  const userId = event.data.custom_data?.user_id;
  const plan = event.data.custom_data?.plan;
  if (!userId || !plan || !PLANS[plan]) return null;

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.updated":
      return {
        userId,
        plan,
        status: "active",
        // A plan change/renewal resets credits to the new plan's monthly
        // allowance — unused credits from the old cycle do not roll over.
        creditsRemaining: PLANS[plan].monthlyCredits,
        paddleSubscriptionId: event.data.id,
        paddleCustomerId: event.data.customer_id,
      };
    case "subscription.canceled":
      return {
        userId,
        plan: "free",
        status: "cancelled",
        creditsRemaining: PLANS.free.monthlyCredits,
        paddleSubscriptionId: event.data.id,
        paddleCustomerId: event.data.customer_id,
      };
    case "transaction.payment_failed":
      return {
        userId,
        plan,
        status: "past_due",
        creditsRemaining: 0, // freeze usage until payment is resolved
        paddleSubscriptionId: event.data.id,
        paddleCustomerId: event.data.customer_id,
      };
    default:
      return null;
  }
}
