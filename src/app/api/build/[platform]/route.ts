import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";
import { dispatchWebhookNotification, buildNotificationPayload } from "@/lib/webhook-notify";

const PLATFORM_ACTION = {
  ios: "submitAppStore",
  android: "submitPlayStore",
} as const;

/**
 * Hard Constraint #4 from the build command: this route is real and
 * wired up, but returns `status: "queued"` instead of actually calling
 * EAS Build or the App/Play Store APIs. Real store submission is an
 * explicit Phase 2 item — see README.md.
 */
export async function POST(req: Request, { params }: { params: { platform: "ios" | "android" } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { appId } = (await req.json()) as { appId: string };
  const action = PLATFORM_ACTION[params.platform];
  if (!action) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", appId).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userContext = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };

  const gate = canUseFeature(userContext, action);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });
  }

  const deduction = deductCredits(userContext, action);
  // Service-role write — see the comment in /api/generate/route.ts for why
  // this can't go through the user's own client once RLS locks
  // subscriptions to read-only for regular users.
  const admin = createServiceRoleClient();
  await admin.from("subscriptions").update({ credits_remaining: deduction.creditsRemaining }).eq("user_id", user.id);

  await admin.from("deployments").insert({
    app_id: appId,
    platform: params.platform,
    store_status: "queued",
  });

  if (app.webhook_url) {
    const payload = buildNotificationPayload(appId, app.name, "build_queued");
    // Fire-and-forget — a failed notification must never break the build queue itself.
    void dispatchWebhookNotification(app.webhook_url, payload);
  }

  return NextResponse.json({
    status: "queued",
    message: "Real store submission ships in Phase 2 once developer-account connections are in place.",
    creditsRemaining: deduction.creditsRemaining,
  });
}
