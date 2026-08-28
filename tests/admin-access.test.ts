import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { evaluateAdminAccess } from "../src/lib/admin-access";

describe("evaluateAdminAccess", () => {
  test("no user at all → 401", () => {
    const result = evaluateAdminAccess(null, null);
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
  });

  test("logged in but not admin → 403", () => {
    const result = evaluateAdminAccess({ id: "user_1" }, "user");
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test("logged in with no role record at all → 403, never 401", () => {
    const result = evaluateAdminAccess({ id: "user_1" }, null);
    assert.equal(result.ok, false);
    assert.equal(result.status, 403);
  });

  test("logged in admin → allowed", () => {
    const result = evaluateAdminAccess({ id: "admin_1" }, "admin");
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(result.userId, "admin_1");
  });
});
