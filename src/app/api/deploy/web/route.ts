import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature } from "@/lib/credits";
import { chargeCredits, refundCredits } from "@/lib/credits-ledger";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, uuidSchema, z } from "@/lib/api/validation";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { getPlan } from "@/lib/plans";
import { generateShareSlug } from "@/lib/share-slug";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";

const bodySchema = z.object({
  appId: uuidSchema,
  customSubdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, "must be 1–63 lowercase letters, numbers or hyphens")
    .optional(),
});

/**
 * Subdomains a customer must not be able to claim: they would shadow
 * Appo's own hostnames or be mistaken for official infrastructure.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "app", "admin", "dashboard", "auth", "login", "mail", "smtp",
  "status", "docs", "help", "support", "billing", "cdn", "static", "assets",
  "staging", "preview", "internal", "appo", "root", "security",
]);

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to deploy.");

  const rate = checkRateLimit(globalRateLimitStore, `deploy:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) {
    const seconds = Math.ceil(rate.retryAfterMs / 1000);
    return apiError("rate_limited", `Too many deployment requests. Try again in ${seconds}s.`, {
      headers: { "Retry-After": String(seconds) },
    });
  }

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", body.appId).eq("user_id", user.id).single(),
  ]);
  if (!profile || !subscription) return apiError("account_not_provisioned", "Your account is still being set up.");
  if (!app) return apiError("not_found", "That app does not exist, or you do not have access to it.");

  const context = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };
  const gate = canUseFeature(context, "deployWebVersion");
  if (!gate.allowed) {
    return apiError(gate.reason === "insufficient_credits" ? "insufficient_credits" : "feature_not_in_plan", gate.message);
  }

  const plan = getPlan(subscription.plan);
  const requestedSubdomain = body.customSubdomain;
  if (requestedSubdomain && !plan.features.customSubdomain && profile.role !== "admin") {
    return apiError("feature_not_in_plan", "Custom subdomains require the Business plan.");
  }
  if (requestedSubdomain && RESERVED_SUBDOMAINS.has(requestedSubdomain)) {
    return apiError("conflict", "That subdomain is reserved. Please choose another.");
  }

  const admin = createServiceRoleClient();
  const { data: latestVersion } = await admin.from("app_versions").select("id, version_number, storage_path, artifact_checksum, artifact_size_bytes").eq("app_id", app.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
  if (!latestVersion) return apiError("conflict", "Generate a version before deploying.");
  if (!latestVersion.storage_path || !latestVersion.artifact_checksum) {
    return apiError("conflict", "This version has no production artifact. Generate a new version before deploying.");
  }
  const { data: artifact } = await admin.storage.from("app-releases").createSignedUrl(latestVersion.storage_path, 60);
  if (!artifact?.signedUrl) return apiError("upstream_unavailable", "The production artifact is unavailable. Please regenerate this version.");

  let shareSlug = app.share_slug as string | null;
  if (!shareSlug) {
    for (let attempt = 0; attempt < 5 && !shareSlug; attempt++) {
      const candidate = generateShareSlug();
      const { data: updated, error } = await admin.from("apps").update({ share_slug: candidate }).eq("id", app.id).is("share_slug", null).select("share_slug").single();
      if (!error && updated?.share_slug) shareSlug = updated.share_slug;
    }
  }
  if (!shareSlug) return apiError("internal_error", "Couldn't prepare a public release URL. Please try again.");

  if (requestedSubdomain) {
    const { data: conflicting } = await admin.from("apps").select("id").eq("custom_subdomain", requestedSubdomain).neq("id", app.id).maybeSingle();
    if (conflicting) return apiError("conflict", "That subdomain is already in use.");
    await admin.from("apps").update({ custom_subdomain: requestedSubdomain }).eq("id", app.id);
  }

  // Web deploys cost 0 credits today, but this still goes through the
  // atomic ledger so the cost can change in lib/plans.ts without
  // reintroducing a read-modify-write here.
  const charge = await chargeCredits(admin, {
    userId: user.id,
    action: "deployWebVersion",
    role: profile.role,
    creditsRemainingHint: subscription.credits_remaining,
  });
  if (!charge.charged) {
    return apiError("insufficient_credits", `Deploying costs ${charge.amount} credits and your balance is too low.`);
  }

  const { data: current } = await admin.from("deployments").select("id").eq("app_id", app.id).eq("platform", "web").eq("is_current", true).maybeSingle();
  if (current) await admin.from("deployments").update({ is_current: false }).eq("id", current.id);

  const baseUrl = new URL(req.url).origin;
  const deploymentUrl = `${baseUrl}/preview/${shareSlug}`;
  const { data: deployment, error } = await admin.from("deployments").insert({
    app_id: app.id,
    platform: "web",
    build_id: `web-${Date.now()}`,
    store_status: "live",
    status: "live",
    is_current: true,
    released_at: new Date().toISOString(),
    version_id: latestVersion.id,
    previous_deployment_id: current?.id ?? null,
    deployment_url: deploymentUrl,
    ota_channel: "production",
    artifact_path: latestVersion.storage_path,
    artifact_checksum: latestVersion.artifact_checksum,
    artifact_size_bytes: latestVersion.artifact_size_bytes,
  }).select().single();

  if (error || !deployment) {
    if (current) await admin.from("deployments").update({ is_current: true }).eq("id", current.id);
    await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "deployment insert failed" });
    return apiError("internal_error", "The deployment could not be recorded. No credits were charged.");
  }

  await Promise.all([
    notify(admin, {
      userId: user.id,
      category: "deployment",
      title: `${app.name} is live`,
      body: `Version ${latestVersion.version_number} is published at ${deploymentUrl}`,
      href: "/dashboard/deployments",
      severity: "success",
    }),
    recordAudit(admin, {
      userId: user.id,
      action: "deployment.created",
      resourceType: "deployment",
      resourceId: deployment.id,
      metadata: { platform: "web", appId: app.id, version: latestVersion.version_number },
    }),
  ]);

  return apiOk({
    deployment,
    url: deploymentUrl,
    version: latestVersion.version_number,
    creditsRemaining: charge.creditsRemaining,
    status: "live",
    artifact: { path: latestVersion.storage_path, checksum: latestVersion.artifact_checksum, sizeBytes: latestVersion.artifact_size_bytes },
    note: "This release is backed by an immutable Appo production artifact. The current public page remains a safe release shell; an external runtime can consume this artifact without changing the project model.",
  });
}
