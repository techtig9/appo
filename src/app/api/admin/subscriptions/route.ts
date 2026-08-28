import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/plans";
import type { PlanId } from "@/lib/supabase/types";

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createServiceRoleClient();
  const { data: subscriptions } = await supabase.from("subscriptions").select("*, users(name, email)");

  return NextResponse.json({ subscriptions });
}

/**
 * Manual override: change a user's plan/status directly. Definition of
 * Done for Phase 1.8 requires this — an admin can view AND override
 * another user's subscription with zero credit deduction on their own
 * account.
 */
export async function PATCH(req: Request) {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { subscriptionId, plan, status } = (await req.json()) as {
    subscriptionId: string;
    plan?: PlanId;
    status?: string;
  };

  if (plan && !PLANS[plan]) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const update: Record<string, unknown> = {};
  if (plan) {
    update.plan = plan;
    update.credits_remaining = PLANS[plan].monthlyCredits;
  }
  if (status) update.status = status;

  const { data, error } = await supabase.from("subscriptions").update(update).eq("id", subscriptionId).select().single();

  if (error) return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  return NextResponse.json({ subscription: data });
}
