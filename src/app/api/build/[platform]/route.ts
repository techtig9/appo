import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature } from "@/lib/credits";
import { chargeCredits } from "@/lib/credits-ledger";
import { dispatchWebhookNotification, buildNotificationPayload } from "@/lib/webhook-notify";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, uuidSchema, z } from "@/lib/api/validation";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

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
const bodySchema = z.object({ appId: uuidSchema });

export async function POST(req: Request, { params }: { params: { platform: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to queue a build.");

  // `params.platform` comes straight from the URL, so it is a string until
  // proven otherwise — the previous signature typed it as "ios" | "android"
  // and trusted that, which is not something the router guarantees.
  const platform = params.platform === "ios" || params.platform === "android" ? params.platform : null;
  if (!platform) return apiError("invalid_request", "Build platform must be ios or android.");
  const action = PLATFORM_ACTION[platform];

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { appId } = parsed.data;

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining, status").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", appId).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription) return apiError("account_not_provisioned", "Your account is still being set up.");
  if (!app) return apiError("not_found", "That app does not exist, or you do not have access to it.");

  const userContext = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };

  const gate = canUseFeature(userContext, action);
  if (!gate.allowed) {
    return apiError(gate.reason === "insufficient_credits" ? "insufficient_credits" : "feature_not_in_plan", gate.message);
  }

  const admin = createServiceRoleClient();

  // Atomic charge (see lib/credits-ledger.ts). The previous read-modify-
  // write let two overlapping builds be charged once between them.
  const charge = await chargeCredits(admin, {
    userId: user.id,
    action,
    role: profile.role,
    creditsRemainingHint: subscription.credits_remaining,
  });
  if (!charge.charged) {
    return apiError("insufficient_credits", `This build costs ${charge.amount} credits and your balance is too low.`);
  }

  const { data: deployment, error: deploymentError } = await admin
    .from("deployments")
    .insert({ app_id: appId, platform, store_status: "queued", status: "queued" })
    .select()
    .single();

  if (deploymentError || !deployment) {
    // Nothing was queued, so the charge has to come back.
    await admin.rpc("refund_credits", { p_user_id: user.id, p_amount: charge.amount });
    return apiError("internal_error", "The build could not be queued. No credits were charged.");
  }

  await Promise.all([
    notify(admin, {
      userId: user.id,
      category: "deployment",
      title: `${platform === "ios" ? "iOS" : "Android"} build queued for ${app.name}`,
      body: "Appo has recorded the build request. Store submission requires a connected developer account — see Help › Deployment.",
      href: "/dashboard/deployments",
    }),
    recordAudit(admin, {
      userId: user.id,
      action: "deployment.created",
      resourceType: "deployment",
      resourceId: deployment.id,
      metadata: { platform, appId },
    }),
  ]);

  if (app.webhook_url) {
    const payload = buildNotificationPayload(appId, app.name, "build_queued");
    // Fire-and-forget — a failed notification must never break the build queue itself.
    void dispatchWebhookNotification(app.webhook_url, payload);
  }

  return apiOk({
    status: "queued",
    deployment,
    // Stated plainly rather than implying the binary is on its way to a
    // store: Appo does not hold developer-account credentials, so it
    // cannot submit on the customer's behalf today.
    message:
      "Build request recorded. Appo does not yet submit to the App Store or Play Store on your behalf — connect a developer account to complete submission.",
    creditsRemaining: charge.creditsRemaining,
  });
}
