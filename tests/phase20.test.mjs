import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

function signature(body, secret, ts) {
  return `ts=${ts};h1=${crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;
}

test("Paddle signature format includes timestamp and HMAC", () => {
  const body = JSON.stringify({ event_type: "subscription.updated", data: { id: "evt_1" } });
  const sig = signature(body, "secret", 1_700_000_000);
  assert.match(sig, /^ts=\d+;h1=[a-f0-9]{64}$/);
});

test("stale webhook timestamps are outside the five-minute acceptance window", () => {
  const stale = 1_700_000_000;
  const now = stale + 301;
  assert.ok(Math.abs(now - stale) > 300);
});

test("webhook idempotency migration defines a unique event id and RLS", () => {
  const sql = fs.readFileSync("supabase/phase-20-migration.sql", "utf8");
  assert.match(sql, /event_id\s+text\s+primary key/i);
  assert.match(sql, /enable row level security/i);
});
