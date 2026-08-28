import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";

export async function DELETE(_req: Request, { params }: { params: { id: string; collaboratorId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const [{ data: app }, { data: sub }, { data: profile }] = await Promise.all([
    supabase.from("apps").select("id").eq("id", params.id).eq("user_id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  if (profile?.role !== "admin" && (!sub || !getPlan(sub.plan).features.teamCollaboration)) return NextResponse.json({ error: "Team collaboration requires Pro or Business." }, { status: 403 });
  const admin = createServiceRoleClient();
  const { error } = await admin.from("app_collaborators").delete().eq("id", params.collaboratorId).eq("app_id", params.id);
  if (error) return NextResponse.json({ error: "Couldn't remove collaborator." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
