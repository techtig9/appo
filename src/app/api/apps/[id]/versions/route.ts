import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

/**
 * Lists an app's version history. Gated the same way rollback itself is
 * (versionHistory plan feature) — no point letting Starter users see a
 * list they can't act on, that's a worse experience than not showing it.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("apps").select("id").eq("id", params.id).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (profile.role !== "admin" && !getPlan(subscription.plan).features.versionHistory) {
    return NextResponse.json(
      { error: "Version history requires Pro or Business.", reason: "feature_not_in_plan" },
      { status: 403 }
    );
  }

  const { data: versions } = await supabase
    .from("app_versions")
    .select("id, version_number, change_summary, created_at")
    .eq("app_id", params.id)
    .order("version_number", { ascending: false });

  return NextResponse.json({ versions: versions ?? [] });
}
