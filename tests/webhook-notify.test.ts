import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildNotificationPayload } from "../src/lib/webhook-notify";

describe("buildNotificationPayload", () => {
  test("includes app id, name, event, and an ISO timestamp", () => {
    const payload = buildNotificationPayload("app_1", "TabTracker", "generation_complete");
    assert.equal(payload.appId, "app_1");
    assert.equal(payload.appName, "TabTracker");
    assert.equal(payload.event, "generation_complete");
    assert.doesNotThrow(() => new Date(payload.timestamp).toISOString());
  });
});
