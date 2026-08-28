import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";
import { getPlan } from "@/lib/plans";
import { generateShareSlug } from "@/lib/share-slug";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rate = checkRateLimit(globalRateLimitStore, `deploy:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) return NextResponse.json({ error: "Too many deployment requests. Please try again shortly." }, { status: 429 });

  const body = (await req.json()) as { appId?: string; customSubdomain?: string };
  if (!body.appId) return NextResponse.json({ error: "appId is required" }, { status: 400 });

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", body.appId).eq("user_id", user.id).single(),
  ]);
  if (!profile || !subscription || !app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const context = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };
  const gate = canUseFeature(context, "deployWebVersion");
  if (!gate.allowed) return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });

  const plan = getPlan(subscription.plan);
  const requestedSubdomain = body.customSubdomain?.trim().toLowerCase();
  if (requestedSubdomain && !plan.features.customSubdomain && profile.role !== "admin") {
    return NextResponse.json({ error: "Custom subdomains require the Business plan.", reason: "feature_not_in_plan" }, { status: 403 });
  }
  if (requestedSubdomain && !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(requestedSubdomain)) {
    return NextResponse.json({ error: "Use 1–63 lowercase letters, numbers or hyphens for the subdomain." }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: latestVersion } = await admin.from("app_versions").select("id, version_number, storage_path, artifact_checksum, artifact_size_bytes").eq("app_id", app.id).order("version_number", { ascending: false }).limit(1).maybeSingle();
  if (!latestVersion) return NextResponse.json({ error: "Generate a version before deploying." }, { status: 409 });
  if (!latestVersion.storage_path || !latestVersion.artifact_checksum) {
    return NextResponse.json({ error: "This version has no production artifact. Generate a new version before deploying." }, { status: 409 });
  }
  const { data: artifact } = await admin.storage.from("app-releases").createSignedUrl(latestVersion.storage_path, 60);
  if (!artifact?.signedUrl) return NextResponse.json({ error: "Production artifact is unavailable. Please regenerate this version." }, { status: 503 });

  let shareSlug = app.share_slug as string | null;
  if (!shareSlug) {
    for (let attempt = 0; attempt < 5 && !shareSlug; attempt++) {
      const candidate = generateShareSlug();
      const { data: updated, error } = await admin.from("apps").update({ share_slug: candidate }).eq("id", app.id).is("share_slug", null).select("share_slug").single();
      if (!error && updated?.share_slug) shareSlug = updated.share_slug;
    }
  }
  if (!shareSlug) return NextResponse.json({ error: "Couldn't prepare a public release URL." }, { status: 500 });

  if (requestedSubdomain) {
    const { data: conflicting } = await admin.from("apps").select("id").eq("custom_subdomain", requestedSubdomain).neq("id", app.id).maybeSingle();
    if (conflicting) return NextResponse.json({ error: "That subdomain is already in use." }, { status: 409 });
    await admin.from("apps").update({ custom_subdomain: requestedSubdomain }).eq("id", app.id);
  }

  const deduction = deductCredits(context, "deployWebVersion");
  await admin.from("subscriptions").update({ credits_remaining: deduction.creditsRemaining }).eq("user_id", user.id);

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
    return NextResponse.json({ error: "Deployment could not be recorded." }, { status: 500 });
  }

  return NextResponse.json({
    deployment,
    url: deploymentUrl,
    version: latestVersion.version_number,
    creditsRemaining: deduction.creditsRemaining,
    status: "live",
    artifact: { path: latestVersion.storage_path, checksum: latestVersion.artifact_checksum, sizeBytes: latestVersion.artifact_size_bytes },
    note: "This release is backed by an immutable Appo production artifact. The current public page remains a safe release shell; an external runtime can consume this artifact without changing the project model.",
  });
}
