import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user.id).single();
  if (!sub || !getPlan(sub.plan).features.teamCollaboration) return NextResponse.json({ apps: [] });
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("app_collaborators").select("app_id,role,apps:app_id(id,name,user_id,version,platforms)").eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Couldn't load shared apps." }, { status: 500 });
  return NextResponse.json({ apps: (data ?? []).map((row: any) => ({ ...row.apps, role: row.role })) });
}
