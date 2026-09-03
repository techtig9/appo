import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plans";
import { createInviteToken, inviteExpiry, normalizeInviteEmail } from "@/lib/collaboration";
import { sendEmail } from "@/lib/email/resend";
import { teamInvitationEmail } from "@/lib/email/templates";
import { recordAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { logger } from "@/lib/logger";

async function getOwner(appId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const [{ data: app }, { data: subscription }, { data: profile }] = await Promise.all([
    supabase.from("apps").select("id,user_id,name").eq("id", appId).eq("user_id", user.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user.id).single(),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);
  if (!app || !subscription || !profile) return { error: NextResponse.json({ error: "App not found" }, { status: 404 }) };
  if (profile.role !== "admin" && !getPlan(subscription.plan).features.teamCollaboration) return { error: NextResponse.json({ error: "Team collaboration requires Pro or Business.", reason: "feature_not_in_plan" }, { status: 403 }) };
  return { user, app, subscription, profile };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ctx = await getOwner(params.id); if (ctx.error) return ctx.error;
  const admin = createServiceRoleClient();
  const [{ data: collaborators, error: ce }, { data: invitations, error: ie }] = await Promise.all([
    admin.from("app_collaborators").select("id,user_id,role,created_at,users:user_id(name,email)").eq("app_id", params.id).order("created_at"),
    admin.from("app_invitations").select("id,email,role,status,expires_at,created_at").eq("app_id", params.id).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  if (ce || ie) return NextResponse.json({ error: "Couldn't load collaborators." }, { status: 500 });
  return NextResponse.json({ app: ctx.app, collaborators: collaborators ?? [], invitations: invitations ?? [] });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getOwner(params.id); if (ctx.error) return ctx.error;
  let body: { email?: string; role?: "editor" | "viewer" };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = normalizeInviteEmail(body.email ?? "");
  const role = body.role === "editor" ? "editor" : "viewer";
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (email === ctx.user.email?.toLowerCase()) return NextResponse.json({ error: "You already own this app." }, { status: 400 });
  const admin = createServiceRoleClient();
  const { data: existingUser } = await admin.from("users").select("id,email,name").eq("email", email).maybeSingle();
  if (existingUser) {
    const { data: existing } = await admin.from("app_collaborators").select("id").eq("app_id", params.id).eq("user_id", existingUser.id).maybeSingle();
    if (existing) return NextResponse.json({ error: "That user is already a collaborator." }, { status: 409 });
  }
  const { data: pending } = await admin.from("app_invitations").select("id").eq("app_id", params.id).eq("email", email).eq("status", "pending").maybeSingle();
  if (pending) return NextResponse.json({ error: "An invitation is already pending for that email." }, { status: 409 });
  const { token, hash } = createInviteToken();
  const expiresAt = inviteExpiry(7);
  const { error } = await admin.from("app_invitations").insert({ app_id: params.id, inviter_id: ctx.user.id, email, role, token_hash: hash, expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "Couldn't create invitation." }, { status: 500 });
  const url = `${new URL(req.url).origin}/dashboard/team?invite=${encodeURIComponent(token)}`;

  // The invitation row and its token existed, but nothing ever told the
  // invitee about them — the URL was returned to the inviter and expected
  // to be copied by hand. Emailing it is what makes the feature usable.
  const delivery = await sendEmail(admin, {
    to: email,
    userId: existingUser?.id,
    template: "team_invitation",
    rendered: teamInvitationEmail({
      inviterName: ctx.user.email ?? "An Appo user",
      appName: ctx.app.name,
      role,
      acceptUrl: url,
    }),
  });

  if (existingUser) {
    await notify(admin, {
      userId: existingUser.id,
      category: "team",
      title: `You've been invited to ${ctx.app.name}`,
      body: `You have been added as a ${role}.`,
      href: "/dashboard/team",
    });
  }

  await recordAudit(admin, {
    userId: ctx.user.id,
    actorEmail: ctx.user.email,
    action: "team.invited",
    resourceType: "app",
    resourceId: params.id,
    metadata: { role, emailStatus: delivery.status },
  });

  if (delivery.status !== "sent") {
    logger.warn("Team invitation email was not delivered", { appId: params.id, status: delivery.status });
  }

  // `emailed` is reported honestly so the UI can offer the copyable link
  // as a fallback rather than claiming an email is on its way.
  return NextResponse.json({ ok: true, inviteUrl: url, expiresAt, emailed: delivery.status === "sent" });
}
