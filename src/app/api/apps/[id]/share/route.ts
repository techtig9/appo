import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateShareSlug } from "@/lib/share-slug";
import { getPlan } from "@/lib/plans";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("apps").select("id, share_slug").eq("id", params.id).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription || !app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  // This was documented as Pro/Business from the start but never actually
  // enforced in code until this pass — caught during a full consistency
  // audit, not by any test (missing gate logic doesn't fail a unit test).
  if (profile.role !== "admin" && !getPlan(subscription.plan).features.shareablePreviewLink) {
    return NextResponse.json(
      { error: "Shareable preview links require Pro or Business.", reason: "feature_not_in_plan" },
      { status: 403 }
    );
  }

  // Reuse the existing slug if one was already generated — sharing twice
  // shouldn't produce two different links for the same app.
  if (app.share_slug) {
    return NextResponse.json({ shareSlug: app.share_slug });
  }

  // Service-role write: share_slug generation is now plan-gated above,
  // validated server-side — writing via the user's own client would let
  // RLS's "update your own app" policy be used to set this directly via
  // the REST API, skipping the plan check.
  const admin = createServiceRoleClient();
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateShareSlug();
    const { data: updated, error } = await admin
      .from("apps")
      .update({ share_slug: slug })
      .eq("id", app.id)
      .select("share_slug")
      .single();

    if (!error && updated) {
      return NextResponse.json({ shareSlug: updated.share_slug });
    }
  }

  return NextResponse.json({ error: "Couldn't generate a share link — please try again." }, { status: 500 });
}
