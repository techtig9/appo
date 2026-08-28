import test from "node:test";
import assert from "node:assert/strict";
import { getCreditStatus, getUsagePercent, formatPlanPrice } from "../src/lib/billing";

test("billing usage percentage is clamped", () => {
  assert.equal(getUsagePercent(500, 1000), 50);
  assert.equal(getUsagePercent(0, 1000), 100);
  assert.equal(getUsagePercent(1000, 1000), 0);
});

test("credit status has healthy, low and critical thresholds", () => {
  assert.equal(getCreditStatus(800, 1000), "healthy");
  assert.equal(getCreditStatus(200, 1000), "low");
  assert.equal(getCreditStatus(50, 1000), "critical");
});

test("plan prices are customer-display safe", () => {
  assert.equal(formatPlanPrice("free"), "$0");
  assert.equal(formatPlanPrice("pro"), "$29");
});
