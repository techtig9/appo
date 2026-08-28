import assert from "node:assert/strict";
import test from "node:test";
import { createInviteToken, hashInviteToken, inviteExpiry, normalizeInviteEmail } from "../src/lib/collaboration";
import { getPlan } from "../src/lib/plans";

test("invite tokens are random and hash consistently", () => {
  const a = createInviteToken();
  const b = createInviteToken();
  assert.notEqual(a.token, b.token);
  assert.equal(hashInviteToken(a.token), a.hash);
  assert.equal(hashInviteToken(b.token), b.hash);
});

test("invite email normalization is deterministic", () => {
  assert.equal(normalizeInviteEmail("  Teammate@Example.COM "), "teammate@example.com");
});

test("invitation expiry defaults to seven days", () => {
  const delta = new Date(inviteExpiry()).getTime() - Date.now();
  assert.ok(delta > 6.9 * 24 * 60 * 60 * 1000);
  assert.ok(delta < 7.1 * 24 * 60 * 60 * 1000);
});

test("collaboration is paid-tier gated", () => {
  assert.equal(getPlan("free").features.teamCollaboration, false);
  assert.equal(getPlan("starter").features.teamCollaboration, false);
  assert.equal(getPlan("pro").features.teamCollaboration, true);
  assert.equal(getPlan("business").features.teamCollaboration, true);
});
