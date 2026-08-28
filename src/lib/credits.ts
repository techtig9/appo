import { CREDIT_COSTS, getPlan, type CreditAction } from "./plans";
import type { PlanId } from "./supabase/types";

export interface UserContext {
  role: "user" | "admin";
  plan: PlanId;
  creditsRemaining: number;
}

export type GateResult =
  | { allowed: true }
  | { allowed: false; reason: "admin_bypass_not_applicable" | "feature_not_in_plan" | "insufficient_credits"; message: string };

/**
 * Maps a credit-consuming action to the feature flag that must be enabled
 * on the user's plan before the action is allowed at all. Actions with no
 * entry here (e.g. voiceTranscription is gated by the "voiceInput" flag
 * checked separately at the call site) are gated purely by credits.
 */
const ACTION_FEATURE_REQUIREMENT: Partial<Record<CreditAction, keyof ReturnType<typeof getPlan>["features"]>> = {
  importAndExtendApp: "importExistingApp",
  exportCode: "codeExport",
  deployWebVersion: "deployWeb",
  submitAppStore: "buildAppStore",
  submitPlayStore: "buildPlayStore",
  cloneApp: "cloneApp",
  githubExport: "githubExport",
};

/**
 * Single shared gate every credit-consuming route calls before doing any
 * real work. Admins always bypass (Phase 1.8). Everyone else needs both
 * the feature enabled on their plan AND enough credits remaining.
 */
export function canUseFeature(user: UserContext, action: CreditAction): GateResult {
  if (user.role === "admin") {
    return { allowed: true };
  }

  const plan = getPlan(user.plan);
  const requiredFeature = ACTION_FEATURE_REQUIREMENT[action];

  if (requiredFeature && !plan.features[requiredFeature]) {
    return {
      allowed: false,
      reason: "feature_not_in_plan",
      message: `This action requires a plan with "${requiredFeature}". Upgrade to unlock it.`,
    };
  }

  const cost = CREDIT_COSTS[action];
  if (user.creditsRemaining < cost) {
    return {
      allowed: false,
      reason: "insufficient_credits",
      message: `This action costs ${cost} credits; you have ${user.creditsRemaining} remaining.`,
    };
  }

  return { allowed: true };
}

export interface DeductionResult {
  success: boolean;
  creditsDeducted: number;
  creditsRemaining: number;
}

/**
 * Deducts credits for an action. Admins are never deducted. Call this only
 * *after* the AI/build call has actually succeeded — a failed request must
 * refund automatically, which in this design just means never deducting
 * in the first place until success is confirmed (see refundIfFailed below
 * for the alternate deduct-then-refund flow used by long-running actions).
 */
export function deductCredits(user: UserContext, action: CreditAction): DeductionResult {
  if (user.role === "admin") {
    return { success: true, creditsDeducted: 0, creditsRemaining: user.creditsRemaining };
  }

  const cost = CREDIT_COSTS[action];
  const remaining = user.creditsRemaining - cost;

  if (remaining < 0) {
    return { success: false, creditsDeducted: 0, creditsRemaining: user.creditsRemaining };
  }

  return { success: true, creditsDeducted: cost, creditsRemaining: remaining };
}

/**
 * For actions where credits must be reserved up front (e.g. a queued build
 * job), call this to refund on failure. Cached/duplicate requests should
 * never reach this path at all — they should short-circuit before any
 * deduction happens.
 */
export function refundIfFailed(
  user: UserContext,
  action: CreditAction,
  outcome: "success" | "failed"
): DeductionResult {
  if (outcome === "success") {
    return deductCredits(user, action);
  }
  return { success: true, creditsDeducted: 0, creditsRemaining: user.creditsRemaining };
}

/**
 * Approximate "full apps per month" capacity shown on the pricing page —
 * derived from monthlyCredits / generateFullApp cost, so it can never
 * silently drift out of sync with the actual numbers again.
 */
export function approximateMonthlyAppCapacity(planId: PlanId): number {
  const plan = getPlan(planId);
  if (plan.monthlyCredits === 0) return 0;
  return Math.floor(plan.monthlyCredits / CREDIT_COSTS.generateFullApp);
}
