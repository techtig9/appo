import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chargeCredits, refundCredits, CreditLedgerError, type AdminClient } from "../src/lib/credits-ledger";
import { CREDIT_COSTS } from "../src/lib/plans";

/**
 * A stand-in for the Supabase admin client that records every RPC call.
 * The point of these tests is the contract between the route and the
 * `consume_credits` function — that the route never computes a balance
 * itself, and that a NULL return is treated as a refusal rather than an
 * error.
 */
function fakeAdmin(responses: { data: unknown; error: unknown }[]) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  let index = 0;
  const client = {
    rpc(fn: string, args: Record<string, unknown>) {
      calls.push({ fn, args });
      return Promise.resolve(responses[index++] ?? { data: null, error: null });
    },
  };
  return { client: client as unknown as AdminClient, calls };
}

describe("chargeCredits", () => {
  test("charges through the atomic RPC and returns the balance the DB reported", async () => {
    const { client, calls } = fakeAdmin([{ data: 500, error: null }]);
    const result = await chargeCredits(client, {
      userId: "u1",
      action: "generateFullApp",
      role: "user",
      creditsRemainingHint: 2000,
    });

    assert.deepEqual(result, { charged: true, amount: CREDIT_COSTS.generateFullApp, creditsRemaining: 500 });
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      fn: "consume_credits",
      args: { p_user_id: "u1", p_amount: CREDIT_COSTS.generateFullApp },
    });
  });

  // The RPC returns NULL when no row satisfied `credits_remaining >= amount`.
  // That is the balance moving under a concurrent request, not a fault.
  test("treats a NULL return as a refusal, not an error", async () => {
    const { client } = fakeAdmin([{ data: null, error: null }]);
    const result = await chargeCredits(client, {
      userId: "u1",
      action: "generateFullApp",
      role: "user",
      creditsRemainingHint: 100,
    });
    assert.equal(result.charged, false);
    if (!result.charged) assert.equal(result.reason, "insufficient_credits");
  });

  test("never calls the database for an admin", async () => {
    const { client, calls } = fakeAdmin([]);
    const result = await chargeCredits(client, {
      userId: "admin",
      action: "generateFullApp",
      role: "admin",
      creditsRemainingHint: 42,
    });
    assert.deepEqual(result, { charged: true, amount: 0, creditsRemaining: 42 });
    assert.equal(calls.length, 0);
  });

  test("never calls the database for a zero-cost action", async () => {
    const { client, calls } = fakeAdmin([]);
    const result = await chargeCredits(client, {
      userId: "u1",
      action: "deployWebVersion",
      role: "user",
      creditsRemainingHint: 7,
    });
    assert.equal(result.charged, true);
    assert.equal(calls.length, 0);
  });

  test("surfaces a genuine database error rather than silently allowing the action", async () => {
    const { client } = fakeAdmin([{ data: null, error: { message: "connection lost" } }]);
    await assert.rejects(
      () => chargeCredits(client, { userId: "u1", action: "generateFullApp", role: "user", creditsRemainingHint: 9000 }),
      CreditLedgerError
    );
  });
});

describe("refundCredits", () => {
  test("refunds through the RPC", async () => {
    const { client, calls } = fakeAdmin([{ data: 2000, error: null }]);
    await refundCredits(client, { userId: "u1", amount: 1500, reason: "generation failed" });
    assert.deepEqual(calls[0], { fn: "refund_credits", args: { p_user_id: "u1", p_amount: 1500 } });
  });

  test("is a no-op for a zero amount", async () => {
    const { client, calls } = fakeAdmin([]);
    await refundCredits(client, { userId: "u1", amount: 0, reason: "nothing charged" });
    assert.equal(calls.length, 0);
  });

  // A failed refund must not turn "your build failed" into a 500 — the
  // user would then see a server error instead of the real reason.
  test("swallows a refund failure instead of throwing", async () => {
    const { client } = fakeAdmin([{ data: null, error: { message: "deadlock" } }]);
    await assert.doesNotReject(() => refundCredits(client, { userId: "u1", amount: 100, reason: "test" }));
  });
});
