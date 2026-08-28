import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

/**
 * Rolls an app back to a previously stored version. This only re-points
 * the app at an existing storage_path already recorded in app_versions —
 * it never calls Gemini, so it's a zero-cost action (Pro/Business only,
 * gated purely on plan access, no credit cost to check).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { versionId } = (await req.json()) as { versionId: string };

  const [{ data: profile }, { data: subscription }, { data: version }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("app_versions").select("*").eq("id", versionId).eq("app_id", params.id).single(),
  ]);

  if (!profile || !subscription || !version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Rollback costs nothing (it's a DB/storage pointer swap, not a
  // regeneration) so it's gated purely on the plan's feature flag —
  // there's no CreditAction involved at all, unlike credit-consuming
  // routes such as /api/generate.
  if (profile.role !== "admin" && !getPlan(subscription.plan).features.versionHistory) {
    return NextResponse.json(
      { error: "Version history & rollback requires Pro or Business.", reason: "feature_not_in_plan" },
      { status: 403 }
    );
  }

  await supabase
    .from("apps")
    .update({ version: `rollback-${version.version_number}`, build_number: version.version_number })
    .eq("id", params.id);

  return NextResponse.json({ restoredVersion: version });
}
