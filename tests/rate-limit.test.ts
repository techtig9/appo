import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, InMemoryRateLimitStore } from "../src/lib/rate-limit";

describe("checkRateLimit", () => {
  test("allows requests under the limit", () => {
    const store = new InMemoryRateLimitStore();
    const config = { limit: 3, windowMs: 60_000 };
    const now = 1_000_000;

    const r1 = checkRateLimit(store, "user_1", config, now);
    const r2 = checkRateLimit(store, "user_1", config, now + 10);
    const r3 = checkRateLimit(store, "user_1", config, now + 20);

    assert.equal(r1.allowed, true);
    assert.equal(r2.allowed, true);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);
  });

  test("blocks the request that exceeds the limit", () => {
    const store = new InMemoryRateLimitStore();
    const config = { limit: 2, windowMs: 60_000 };
    const now = 1_000_000;

    checkRateLimit(store, "user_1", config, now);
    checkRateLimit(store, "user_1", config, now + 10);
    const blocked = checkRateLimit(store, "user_1", config, now + 20);

    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterMs > 0);
  });

  test("resets once the window has fully elapsed", () => {
    const store = new InMemoryRateLimitStore();
    const config = { limit: 1, windowMs: 60_000 };
    const now = 1_000_000;

    checkRateLimit(store, "user_1", config, now);
    const stillBlocked = checkRateLimit(store, "user_1", config, now + 30_000); // 30s later, same window
    const resetAllowed = checkRateLimit(store, "user_1", config, now + 60_001); // window passed

    assert.equal(stillBlocked.allowed, false);
    assert.equal(resetAllowed.allowed, true);
  });

  test("different keys are tracked independently", () => {
    const store = new InMemoryRateLimitStore();
    const config = { limit: 1, windowMs: 60_000 };
    const now = 1_000_000;

    const userA = checkRateLimit(store, "user_a", config, now);
    const userB = checkRateLimit(store, "user_b", config, now);

    assert.equal(userA.allowed, true);
    assert.equal(userB.allowed, true, "user_b must not be blocked by user_a's usage");
  });

  test("retryAfterMs counts down correctly toward window end", () => {
    const store = new InMemoryRateLimitStore();
    const config = { limit: 1, windowMs: 60_000 };
    const now = 1_000_000;

    checkRateLimit(store, "user_1", config, now);
    const blocked = checkRateLimit(store, "user_1", config, now + 45_000); // 45s into the window

    assert.equal(blocked.retryAfterMs, 15_000); // 15s left in the window
  });
});
