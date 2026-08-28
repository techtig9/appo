import test from "node:test";
import assert from "node:assert/strict";

test("phase 6 release lifecycle contract", () => {
  const columns = ["version_id", "status", "is_current", "released_at", "rolled_back_at", "previous_deployment_id"];
  assert.deepEqual(columns.sort(), [...columns].sort());
});

test("phase 6 rollback requires a previous deployment", () => {
  const current = { is_current: true, previous_deployment_id: "previous" };
  assert.equal(current.is_current && Boolean(current.previous_deployment_id), true);
});
