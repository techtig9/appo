import test from "node:test";
import assert from "node:assert/strict";
import { lastNDates, percentage } from "../src/lib/analytics";

test("analytics returns a stable 14-day date window", () => {
  const dates = lastNDates(14, new Date("2026-08-15T12:00:00Z"));
  assert.equal(dates.length, 14);
  assert.equal(dates[0], "2026-08-02");
  assert.equal(dates.at(-1), "2026-08-15");
});

test("percentage safely handles zero totals", () => {
  assert.equal(percentage(4, 8), 50);
  assert.equal(percentage(1, 0), 0);
});
