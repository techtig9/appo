import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeOnboardingProgress } from "../src/lib/onboarding";

describe("computeOnboardingProgress", () => {
  test("nothing done for a brand-new user", () => {
    const progress = computeOnboardingProgress(0, false);
    assert.equal(progress.allDone, false);
    assert.ok(progress.steps.every((s) => !s.done));
  });

  test("describe and generate steps complete once an app exists", () => {
    const progress = computeOnboardingProgress(1, false);
    assert.equal(progress.steps.find((s) => s.id === "describe")?.done, true);
    assert.equal(progress.steps.find((s) => s.id === "generate")?.done, true);
    assert.equal(progress.steps.find((s) => s.id === "export")?.done, false);
    assert.equal(progress.allDone, false);
  });

  test("all done once an app exists and something was exported/deployed", () => {
    const progress = computeOnboardingProgress(1, true);
    assert.equal(progress.allDone, true);
  });

  test("export step never completes on its own without an app existing (defensive, shouldn't happen in practice)", () => {
    const progress = computeOnboardingProgress(0, true);
    assert.equal(progress.steps.find((s) => s.id === "describe")?.done, false);
    assert.equal(progress.allDone, false);
  });
});
