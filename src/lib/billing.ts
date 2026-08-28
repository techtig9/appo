import type { PlanId } from "./supabase/types";
import { PLANS } from "./plans";

export function formatPlanPrice(plan: PlanId): string {
  return plan === "free" ? "$0" : `$${(PLANS[plan].priceMonthlyCents / 100).toFixed(0)}`;
}

export function getUsagePercent(remaining: number, granted: number): number {
  if (granted <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((granted - remaining) / granted) * 100)));
}

export function getCreditStatus(remaining: number, granted: number): "healthy" | "low" | "critical" {
  if (granted <= 0) return "critical";
  const ratio = remaining / granted;
  if (ratio <= 0.1) return "critical";
  if (ratio <= 0.25) return "low";
  return "healthy";
}
