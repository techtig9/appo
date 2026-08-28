import type { PlanId } from "./supabase/types";

export interface LowCreditWarning {
  show: boolean;
  level: "none" | "notice" | "critical";
  message: string;
}

/**
 * Pure threshold logic for the low-credit banner shown in the dashboard.
 * Kept separate from the component so the thresholds are unit-testable
 * without mounting React.
 */
export function getLowCreditWarning(remaining: number, granted: number): LowCreditWarning {
  if (granted <= 0) return { show: false, level: "none", message: "" };

  const pct = remaining / granted;

  if (pct <= 0.05) {
    return {
      show: true,
      level: "critical",
      message: `You're almost out of credits (${remaining} left). Upgrade or wait for your next billing cycle to keep generating.`,
    };
  }

  if (pct <= 0.15) {
    return {
      show: true,
      level: "notice",
      message: `Running low on credits — ${remaining} left this cycle.`,
    };
  }

  return { show: false, level: "none", message: "" };
}

export interface CancellationResult {
  newStatus: "cancelled";
  effectiveAt: "period_end";
  retainsAccessUntilPeriodEnd: boolean;
  downgradeToOnPeriodEnd: PlanId;
}

/**
 * Self-serve cancellation always takes effect at the end of the current
 * billing period, never immediately — the user keeps what they paid for.
 * Pure function so the policy is unit-tested independent of the API route
 * and the Paddle call that actually schedules it.
 */
export function computeCancellation(): CancellationResult {
  return {
    newStatus: "cancelled",
    effectiveAt: "period_end",
    retainsAccessUntilPeriodEnd: true,
    downgradeToOnPeriodEnd: "free",
  };
}
