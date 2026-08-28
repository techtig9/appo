import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

/**
 * Publishing costs nothing to run — it's a boolean flip on an existing
 * row — but the FEATURE (appearing in the gallery, giving other users a
 * template to build on) is Pro/Business per the pricing page, so it's
 * plan-gated the same way rollback is: a real feature check, not a
 * credit check, since there's no AI call involved.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("apps").select("id, is_public_template").eq("id", params.id).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (profile.role !== "admin" && !getPlan(subscription.plan).features.publicTemplateGallery) {
    return NextResponse.json(
      { error: "Publishing to the template gallery requires Pro or Business.", reason: "feature_not_in_plan" },
      { status: 403 }
    );
  }

  // Service-role write: is_public_template is a plan-gated capability
  // (Pro/Business), validated above — writing it via the user's own
  // client would let RLS's "update your own app" policy be used to flip
  // this flag directly via the REST API, skipping the plan check entirely.
  const admin = createServiceRoleClient();
  const { data: updated } = await admin
    .from("apps")
    .update({ is_public_template: !app.is_public_template })
    .eq("id", app.id)
    .select("id, is_public_template")
    .single();

  return NextResponse.json({ app: updated });
}
