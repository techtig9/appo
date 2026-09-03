import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  verifyPaddleSignature,
  mapPaddleEventToSubscriptionUpdate,
  resolveCreditsRemaining,
  webhookIdempotencyKey,
} from "../src/lib/paddle";

function signBody(rawBody: string, secret: string, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

describe("verifyPaddleSignature", () => {
  test("accepts a correctly signed payload", () => {
    const secret = "whsec_test_secret";
    const body = JSON.stringify({ hello: "world" });
    const header = signBody(body, secret);
    assert.equal(verifyPaddleSignature(body, header, secret), true);
  });

  test("rejects a tampered body", () => {
    const secret = "whsec_test_secret";
    const header = signBody(JSON.stringify({ hello: "world" }), secret);
    const tamperedBody = JSON.stringify({ hello: "world!! injected" });
    assert.equal(verifyPaddleSignature(tamperedBody, header, secret), false);
  });

  test("rejects the wrong secret", () => {
    const body = JSON.stringify({ hello: "world" });
    const header = signBody(body, "whsec_real_secret");
    assert.equal(verifyPaddleSignature(body, header, "whsec_wrong_guess"), false);
  });

  test("rejects a malformed header", () => {
    assert.equal(verifyPaddleSignature("{}", "not-a-valid-header", "secret"), false);
  });
});

describe("mapPaddleEventToSubscriptionUpdate", () => {
  test("subscription.created grants the new plan's full monthly credits", () => {
    const update = mapPaddleEventToSubscriptionUpdate({
      event_type: "subscription.created",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        custom_data: { user_id: "user_789", plan: "pro" },
      },
    });
    assert.ok(update);
    assert.equal(update?.plan, "pro");
    assert.equal(update?.status, "active");
    assert.equal(update?.creditsGranted, 40000);
    assert.equal(update?.creditPolicy, "grant");
    assert.equal(resolveCreditsRemaining(update!, 0), 40000);
  });

  test("subscription.canceled downgrades to free with free-tier credits", () => {
    const update = mapPaddleEventToSubscriptionUpdate({
      event_type: "subscription.canceled",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        custom_data: { user_id: "user_789", plan: "business" },
      },
    });
    assert.equal(update?.plan, "free");
    assert.equal(update?.status, "cancelled");
    assert.equal(update?.creditsGranted, 2000);
    assert.equal(resolveCreditsRemaining(update!, 38000), 2000);
  });

  test("transaction.payment_failed freezes credits at 0 without changing the plan", () => {
    const update = mapPaddleEventToSubscriptionUpdate({
      event_type: "transaction.payment_failed",
      data: {
        id: "sub_123",
        customer_id: "cus_456",
        custom_data: { user_id: "user_789", plan: "starter" },
      },
    });
    assert.equal(update?.plan, "starter");
    assert.equal(update?.status, "past_due");
    assert.equal(update?.creditPolicy, "freeze");
    assert.equal(resolveCreditsRemaining(update!, 9000), 0);
  });

  test("returns null when required custom_data is missing (can't safely apply)", () => {
    const update = mapPaddleEventToSubscriptionUpdate({
      event_type: "subscription.created",
      data: { id: "sub_123", customer_id: "cus_456" },
    });
    assert.equal(update, null);
  });

  // Regression: subscription.updated fires for administrative changes
  // (card updated, next_billed_at moved). Treating each one as a renewal
  // handed the customer a full month of credits for free.
  test("subscription.updated on the SAME plan preserves the existing balance", () => {
    const update = mapPaddleEventToSubscriptionUpdate(
      {
        event_type: "subscription.updated",
        data: { id: "sub_123", customer_id: "cus_456", custom_data: { user_id: "user_789", plan: "pro" } },
      },
      "pro"
    );
    assert.equal(update?.creditPolicy, "preserve");
    assert.equal(resolveCreditsRemaining(update!, 1234), 1234);
  });

  test("subscription.updated to a DIFFERENT plan reissues that plan's allowance", () => {
    const update = mapPaddleEventToSubscriptionUpdate(
      {
        event_type: "subscription.updated",
        data: { id: "sub_123", customer_id: "cus_456", custom_data: { user_id: "user_789", plan: "business" } },
      },
      "starter"
    );
    assert.equal(update?.creditPolicy, "grant");
    assert.equal(resolveCreditsRemaining(update!, 100), 90000);
  });

  test("a preserved balance is clamped to the new plan's allowance on downgrade", () => {
    const update = mapPaddleEventToSubscriptionUpdate(
      {
        event_type: "subscription.resumed",
        data: { id: "sub_123", customer_id: "cus_456", custom_data: { user_id: "user_789", plan: "starter" } },
      },
      "starter"
    );
    // 80,000 credits left over from a Business cycle must not survive on Starter.
    assert.equal(resolveCreditsRemaining(update!, 80000), 12000);
  });

  test("transaction.completed reissues the allowance (renewal signal)", () => {
    const update = mapPaddleEventToSubscriptionUpdate(
      {
        event_type: "transaction.completed",
        data: { id: "txn_1", customer_id: "cus_456", custom_data: { user_id: "user_789", plan: "starter" } },
      },
      "starter"
    );
    assert.equal(update?.creditPolicy, "grant");
    assert.equal(resolveCreditsRemaining(update!, 5), 12000);
  });
});

describe("webhookIdempotencyKey", () => {
  // Regression for the highest-impact billing bug found in the audit: the
  // webhook table was keyed on `data.id`, which for a subscription event
  // is the SUBSCRIPTION id and therefore identical across every event
  // about that subscription. A paid upgrade collided with the row written
  // at signup and was discarded as a duplicate.
  test("uses Paddle's per-delivery event_id, not the subject id", () => {
    const created = webhookIdempotencyKey({
      event_id: "evt_created",
      event_type: "subscription.created",
      data: { id: "sub_123", customer_id: "cus_1" },
    });
    const updated = webhookIdempotencyKey({
      event_id: "evt_updated",
      event_type: "subscription.updated",
      data: { id: "sub_123", customer_id: "cus_1" },
    });

    assert.equal(created, "evt_created");
    assert.notEqual(created, updated);
  });

  test("falls back to a composite key that still separates event types", () => {
    const a = webhookIdempotencyKey({
      event_type: "subscription.created",
      occurred_at: "2026-01-01T00:00:00Z",
      data: { id: "sub_123", customer_id: "cus_1" },
    });
    const b = webhookIdempotencyKey({
      event_type: "subscription.updated",
      occurred_at: "2026-01-01T00:00:00Z",
      data: { id: "sub_123", customer_id: "cus_1" },
    });
    assert.notEqual(a, b);
  });

  test("rejects a malformed event_id rather than trusting it as a key", () => {
    const key = webhookIdempotencyKey({
      event_id: "evt with spaces and 'quotes'",
      event_type: "subscription.created",
      occurred_at: "2026-01-01T00:00:00Z",
      data: { id: "sub_123", customer_id: "cus_1" },
    });
    assert.equal(key, "subscription.created:sub_123:2026-01-01T00:00:00Z");
  });
});
