import test from "node:test";
import assert from "node:assert/strict";
import { computeOnboardingProgress } from "../src/lib/onboarding";

test("phase 12 onboarding progress completes after app and deployment", () => {
  const p = computeOnboardingProgress(1, true);
  assert.equal(p.allDone, true);
  assert.equal(p.steps.filter((s) => s.done).length, 3);
});
test("phase 12 onboarding stays actionable for a new workspace", () => {
  const p = computeOnboardingProgress(0, false);
  assert.equal(p.allDone, false);
  assert.equal(p.steps.every((s) => !s.done), true);
});
