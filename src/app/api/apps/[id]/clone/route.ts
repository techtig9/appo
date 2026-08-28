import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: original }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", params.id).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription) {
    return NextResponse.json({ error: "Account not fully provisioned" }, { status: 500 });
  }
  if (!original) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  const userContext = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };

  // cloneApp costs 0 credits by design (see plans.ts CREDIT_COSTS) — this
  // gate only ever fails on plan access, never on balance.
  const gate = canUseFeature(userContext, "cloneApp");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });
  }

  const { data: clone, error } = await supabase
    .from("apps")
    .insert({
      user_id: user.id,
      name: `${original.name} (copy)`,
      bundle_id: null, // must be unique per app store; cleared on clone
      platforms: original.platforms,
      folder: original.folder,
      tags: original.tags,
      cloned_from: original.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to clone app" }, { status: 500 });
  }

  // Zero-credit action — recorded for the deduction result shape's sake,
  // but creditsRemaining is unchanged.
  const deduction = deductCredits(userContext, "cloneApp");

  return NextResponse.json({ app: clone, creditsRemaining: deduction.creditsRemaining });
}
