import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyPaddleSignature, mapPaddleEventToSubscriptionUpdate } from "../src/lib/paddle";

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
    assert.equal(update?.creditsRemaining, 40000);
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
    assert.equal(update?.creditsRemaining, 2000);
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
    assert.equal(update?.creditsRemaining, 0);
  });

  test("returns null when required custom_data is missing (can't safely apply)", () => {
    const update = mapPaddleEventToSubscriptionUpdate({
      event_type: "subscription.created",
      data: { id: "sub_123", customer_id: "cus_456" },
    });
    assert.equal(update, null);
  });
});
