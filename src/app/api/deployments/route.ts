import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: deployments, error } = await supabase
    .from("deployments")
    .select("id, app_id, platform, build_id, store_status, deployment_url, ota_channel, version_id, status, is_current, released_at, rolled_back_at, previous_deployment_id")
    .in("app_id", (await supabase.from("apps").select("id").eq("user_id", user.id)).data?.map((a) => a.id) ?? [])
    .order("id", { ascending: false });
  if (error) return NextResponse.json({ error: "Couldn't load deployments." }, { status: 500 });
  return NextResponse.json({ deployments: deployments ?? [] });
}
