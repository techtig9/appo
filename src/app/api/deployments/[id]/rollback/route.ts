import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: deployment }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("deployments").select("*").eq("id", params.id).eq("platform", "web").single(),
  ]);
  if (!profile || !subscription || !deployment) return NextResponse.json({ error: "Deployment not found" }, { status: 404 });

  const { data: app } = await supabase.from("apps").select("id, user_id").eq("id", deployment.app_id).eq("user_id", user.id).single();
  if (!app) return NextResponse.json({ error: "Deployment not found" }, { status: 404 });
  if (profile.role !== "admin" && !getPlan(subscription.plan).features.versionHistory) {
    return NextResponse.json({ error: "Deployment rollback requires Pro or Business.", reason: "feature_not_in_plan" }, { status: 403 });
  }
  if (deployment.is_current !== true) return NextResponse.json({ error: "Only the current release can be rolled back." }, { status: 409 });
  if (!deployment.previous_deployment_id) return NextResponse.json({ error: "No previous release is available." }, { status: 409 });

  const admin = createServiceRoleClient();
  const { data: previous } = await admin.from("deployments").select("*").eq("id", deployment.previous_deployment_id).eq("app_id", app.id).single();
  if (!previous) return NextResponse.json({ error: "Previous release metadata is missing." }, { status: 409 });

  await admin.from("deployments").update({ is_current: false, status: "rolled_back", store_status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", deployment.id);
  const { data: restored, error } = await admin.from("deployments").update({ is_current: true, status: "live", store_status: "live", released_at: new Date().toISOString() }).eq("id", previous.id).select().single();
  if (error || !restored) {
    await admin.from("deployments").update({ is_current: true, status: deployment.status, store_status: deployment.store_status, rolled_back_at: null }).eq("id", deployment.id);
    return NextResponse.json({ error: "Rollback could not be completed." }, { status: 500 });
  }

  return NextResponse.json({ restored: restored, rolledBackDeploymentId: deployment.id });
}
