import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: owned } = await supabase.from("apps").select("*").eq("id", params.id).eq("user_id", user.id).single();
  let app = owned;
  let role: "owner" | "editor" | "viewer" = "owner";

  if (!app) {
    const admin = createServiceRoleClient();
    const { data: membership } = await admin.from("app_collaborators").select("role").eq("app_id", params.id).eq("user_id", user.id).single();
    if (!membership) return NextResponse.json({ error: "App not found" }, { status: 404 });
    role = membership.role as "editor" | "viewer";
    const { data } = await admin.from("apps").select("*").eq("id", params.id).single();
    app = data;
  }

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const client = app.user_id === user.id ? supabase : createServiceRoleClient();
  const [{ data: versions }, { data: deployments }] = await Promise.all([
    client.from("app_versions").select("id,version_number,change_summary,created_at").eq("app_id", params.id).order("version_number", { ascending: false }).limit(12),
    client.from("deployments").select("id,platform,build_id,store_status,deployment_url,status,is_current,released_at,rolled_back_at,version_id").eq("app_id", params.id).order("released_at", { ascending: false, nullsFirst: false }).limit(12),
  ]);

  return NextResponse.json({ app, role, versions: versions ?? [], deployments: deployments ?? [] });
}
