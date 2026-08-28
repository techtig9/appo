import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { hashInviteToken } from "@/lib/collaboration";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in before accepting an invitation." }, { status: 401 });
  let body: { token?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const token = body.token?.trim() ?? "";
  if (token.length < 32) return NextResponse.json({ error: "Invalid invitation." }, { status: 400 });
  const admin = createServiceRoleClient();
  const { data: invite } = await admin.from("app_invitations").select("id,app_id,email,role,status,expires_at").eq("token_hash", hashInviteToken(token)).single();
  if (!invite || invite.status !== "pending") return NextResponse.json({ error: "This invitation is no longer active." }, { status: 410 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    await admin.from("app_invitations").update({ status: "expired" }).eq("id", invite.id);
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 });
  }
  if (invite.email.toLowerCase() !== (user.email ?? "").toLowerCase()) return NextResponse.json({ error: "This invitation was sent to a different email address." }, { status: 403 });
  const { error: upsertError } = await admin.from("app_collaborators").upsert({ app_id: invite.app_id, user_id: user.id, role: invite.role }, { onConflict: "app_id,user_id" });
  if (upsertError) return NextResponse.json({ error: "Couldn't accept invitation." }, { status: 500 });
  await admin.from("app_invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", invite.id);
  const { data: app } = await admin.from("apps").select("id,name").eq("id", invite.app_id).single();
  return NextResponse.json({ ok: true, app });
}
