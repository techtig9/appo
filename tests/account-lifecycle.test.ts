import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getLowCreditWarning, computeCancellation } from "../src/lib/account-lifecycle";

describe("getLowCreditWarning", () => {
  test("no warning when plenty of credits remain", () => {
    const result = getLowCreditWarning(7000, 8000);
    assert.equal(result.show, false);
  });

  test("notice-level warning at 15% or below", () => {
    const result = getLowCreditWarning(1000, 8000); // 12.5%
    assert.equal(result.show, true);
    assert.equal(result.level, "notice");
  });

  test("critical-level warning at 5% or below", () => {
    const result = getLowCreditWarning(300, 8000); // 3.75%
    assert.equal(result.show, true);
    assert.equal(result.level, "critical");
  });

  test("exactly at the 15% boundary is a notice", () => {
    const result = getLowCreditWarning(1200, 8000); // exactly 15%
    assert.equal(result.show, true);
    assert.equal(result.level, "notice");
  });

  test("exactly at the 5% boundary is critical, not notice", () => {
    const result = getLowCreditWarning(400, 8000); // exactly 5%
    assert.equal(result.level, "critical");
  });

  test("Free plan (0 granted) never shows a warning — avoids divide-by-zero", () => {
    const result = getLowCreditWarning(0, 0);
    assert.equal(result.show, false);
  });

  test("message includes the actual remaining count", () => {
    const result = getLowCreditWarning(42, 8000);
    assert.match(result.message, /42/);
  });
});

describe("computeCancellation", () => {
  test("always cancels at period end, never immediately", () => {
    const result = computeCancellation();
    assert.equal(result.effectiveAt, "period_end");
    assert.equal(result.retainsAccessUntilPeriodEnd, true);
  });

  test("downgrades to free once the period ends", () => {
    const result = computeCancellation();
    assert.equal(result.downgradeToOnPeriodEnd, "free");
  });
});
