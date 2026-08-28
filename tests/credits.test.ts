import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canUseFeature, deductCredits, refundIfFailed, approximateMonthlyAppCapacity } from "../src/lib/credits";
import { CREDIT_COSTS } from "../src/lib/plans";

describe("canUseFeature", () => {
  test("admin always bypasses, regardless of plan or credits", () => {
    const result = canUseFeature({ role: "admin", plan: "free", creditsRemaining: 0 }, "generateFullApp");
    assert.equal(result.allowed, true);
  });

  test("free-tier user is blocked from a Pro/Starter-gated feature (code export)", () => {
    const result = canUseFeature({ role: "user", plan: "free", creditsRemaining: 999999 }, "exportCode");
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.reason, "feature_not_in_plan");
  });

  test("starter-tier user IS allowed to export code (feature enabled) with enough credits", () => {
    const result = canUseFeature({ role: "user", plan: "starter", creditsRemaining: 500 }, "exportCode");
    assert.equal(result.allowed, true);
  });

  test("starter-tier user is blocked from Pro-only cloneApp import/export... (githubExport is Pro+)", () => {
    const result = canUseFeature({ role: "user", plan: "starter", creditsRemaining: 999999 }, "githubExport");
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.reason, "feature_not_in_plan");
  });

  test("pro-tier user IS allowed githubExport", () => {
    const result = canUseFeature({ role: "user", plan: "pro", creditsRemaining: 100 }, "githubExport");
    assert.equal(result.allowed, true);
  });

  test("plan allows the feature but user lacks enough credits", () => {
    const result = canUseFeature({ role: "user", plan: "starter", creditsRemaining: 100 }, "importAndExtendApp");
    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.reason, "insufficient_credits");
  });

  test("zero-cost actions (cloneApp, githubExport) never fail on credits, only on plan gating", () => {
    const result = canUseFeature({ role: "user", plan: "pro", creditsRemaining: 0 }, "cloneApp");
    assert.equal(result.allowed, true, "cloneApp costs 0 credits, so 0 remaining credits must still pass");
  });
});

describe("deductCredits", () => {
  test("deducts the correct amount for a generation", () => {
    const result = deductCredits({ role: "user", plan: "starter", creditsRemaining: 12000 }, "generateFullApp");
    assert.equal(result.success, true);
    assert.equal(result.creditsDeducted, CREDIT_COSTS.generateFullApp);
    assert.equal(result.creditsRemaining, 12000 - CREDIT_COSTS.generateFullApp);
  });

  test("refuses to deduct below zero", () => {
    const result = deductCredits({ role: "user", plan: "starter", creditsRemaining: 50 }, "generateFullApp");
    assert.equal(result.success, false);
    assert.equal(result.creditsRemaining, 50, "balance must be untouched on failure");
  });

  test("admin deduction is always a no-op", () => {
    const result = deductCredits({ role: "admin", plan: "free", creditsRemaining: 0 }, "generateFullApp");
    assert.equal(result.success, true);
    assert.equal(result.creditsDeducted, 0);
  });
});

describe("refundIfFailed", () => {
  test("failed AI generation refunds automatically — credits never move", () => {
    const before = { role: "user" as const, plan: "starter" as const, creditsRemaining: 5000 };
    const result = refundIfFailed(before, "generateFullApp", "failed");
    assert.equal(result.creditsRemaining, 5000, "a failed request must leave the balance untouched");
  });

  test("successful generation still deducts normally through the same path", () => {
    const before = { role: "user" as const, plan: "starter" as const, creditsRemaining: 5000 };
    const result = refundIfFailed(before, "generateFullApp", "success");
    assert.equal(result.creditsRemaining, 5000 - CREDIT_COSTS.generateFullApp);
  });
});

describe("approximateMonthlyAppCapacity", () => {
  test("matches the Pricing Package's 'Approximate Monthly Capacity' table", () => {
    // Doc says: Free ~1, Starter ~8, Pro ~26, Business ~60
    assert.equal(approximateMonthlyAppCapacity("starter"), 8);
    assert.equal(approximateMonthlyAppCapacity("pro"), 26);
    assert.equal(approximateMonthlyAppCapacity("business"), 60);
    assert.equal(
      approximateMonthlyAppCapacity("free"),
      1,
      "Free must support at least one full generation — that's the entire activation moment"
    );
  });
});
