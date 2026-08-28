import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: seed }, { data: community }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("templates").select("id, name, category").eq("id", params.id).maybeSingle(),
    supabase.from("apps").select("id, name, platforms, tags").eq("id", params.id).eq("is_public_template", true).maybeSingle(),
  ]);

  if (!profile || !subscription) return NextResponse.json({ error: "Account not fully provisioned" }, { status: 500 });
  const template = community ?? seed;
  if (!template) return NextResponse.json({ error: "Template not found or no longer public" }, { status: 404 });

  const userContext = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };
  const gate = canUseFeature(userContext, "cloneApp");
  if (!gate.allowed) return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });

  const isCommunity = Boolean(community);
  const platforms = "platforms" in template && template.platforms?.length ? template.platforms : ["web"];
  const category = "category" in template ? template.category : "starter";
  const tags = "tags" in template && template.tags?.length ? template.tags : [category];

  const { data: clone, error } = await supabase.from("apps").insert({
    user_id: user.id,
    name: `${template.name} (from template)`,
    platforms,
    tags,
    cloned_from: isCommunity ? template.id : null,
    is_public_template: false,
  }).select().single();

  if (error) return NextResponse.json({ error: "Failed to create app from template" }, { status: 500 });
  const deduction = deductCredits(userContext, "cloneApp");
  return NextResponse.json({ app: clone, creditsRemaining: deduction.creditsRemaining });
}
