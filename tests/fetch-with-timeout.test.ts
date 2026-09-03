import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isRetryableStatus, backoffDelayMs, withRetry } from "../src/lib/http/fetch-with-timeout";
import { __testables } from "../src/lib/ai-router";

describe("isRetryableStatus", () => {
  test("retries only transient statuses", () => {
    for (const status of [408, 425, 429, 500, 502, 503, 504, 529]) {
      assert.equal(isRetryableStatus(status), true, `${status} should retry`);
    }
  });

  // Retrying a 400 or a 401 just burns the user's wall clock and delays
  // failover to a provider that would have worked.
  test("does not retry a request that will fail identically", () => {
    for (const status of [200, 400, 401, 403, 404, 422]) {
      assert.equal(isRetryableStatus(status), false, `${status} should not retry`);
    }
  });
});

describe("backoffDelayMs", () => {
  test("grows exponentially and is capped", () => {
    assert.equal(backoffDelayMs(0, 400, 8000), 400);
    assert.equal(backoffDelayMs(1, 400, 8000), 800);
    assert.equal(backoffDelayMs(2, 400, 8000), 1600);
    assert.equal(backoffDelayMs(10, 400, 8000), 8000);
  });
});

describe("withRetry", () => {
  const noSleep = async () => {};

  test("returns the first successful result without retrying", async () => {
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls++;
        return "ok";
      },
      () => true,
      { sleep: noSleep }
    );
    assert.equal(value, "ok");
    assert.equal(calls, 1);
  });

  test("retries a transient failure up to the attempt limit", async () => {
    let calls = 0;
    const value = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("503 service unavailable");
        return "recovered";
      },
      () => true,
      { attempts: 3, sleep: noSleep }
    );
    assert.equal(value, "recovered");
    assert.equal(calls, 3);
  });

  test("stops immediately when the failure is not retryable", async () => {
    let calls = 0;
    await assert.rejects(() =>
      withRetry(
        async () => {
          calls++;
          throw new Error("401 unauthorized");
        },
        () => false,
        { attempts: 5, sleep: noSleep }
      )
    );
    assert.equal(calls, 1);
  });

  test("rethrows the last error once attempts are exhausted", async () => {
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            throw new Error("still failing");
          },
          () => true,
          { attempts: 2, sleep: noSleep }
        ),
      /still failing/
    );
  });
});

describe("ai-router retry policy", () => {
  test("a 429 or 5xx from a provider is worth one more attempt", () => {
    assert.equal(__testables.shouldRetrySameProvider(new Error("429 rate limit exceeded")), true);
    assert.equal(__testables.shouldRetrySameProvider(new Error("503 overloaded")), true);
  });

  test("a configuration error is not", () => {
    assert.equal(__testables.shouldRetrySameProvider(new Error("model not found")), false);
  });

  test("generation and chat carry different timeout budgets", () => {
    assert.ok(__testables.GENERATION_TIMEOUT_MS > __testables.CHAT_TIMEOUT_MS);
    assert.ok(__testables.CHAT_TIMEOUT_MS <= 30_000);
  });
});
