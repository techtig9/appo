import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature } from "@/lib/credits";
import { chargeCredits, refundCredits } from "@/lib/credits-ledger";
import { generateApp, type GenerateAppRequest } from "@/lib/gemini";
import { buildEngineeredContext, type AppCategory } from "@/lib/prompt-engineer";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { createReleaseArtifact } from "@/lib/release-artifact";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, z } from "@/lib/api/validation";
import { validateGeneratedProject } from "@/lib/generated-project-safety";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const ROUTE = "/api/generate";

const answersSchema = z.object({
  platforms: z.array(z.enum(["ios", "android", "web"])).min(1, "pick at least one platform").max(3),
  coreScreens: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  navigationPattern: z.enum(["tabs", "stack", "drawer"]),
  needsBackend: z.boolean(),
  colorTheme: z.string().trim().max(60).default("default"),
  authentication: z.enum(["none", "email", "email_google"]),
  database: z.enum(["none", "postgresql"]),
  apiStyle: z.enum(["none", "rest"]),
  fileStorage: z.boolean(),
});

const importedProjectSchema = z.object({
  source: z.enum(["github", "zip"]),
  ref: z.string().trim().min(1).max(400),
  files: z
    .array(z.object({ path: z.string().min(1).max(400), content: z.string().max(200_000) }))
    .max(400)
    .optional(),
});

const bodySchema = z.object({
  name: z.string().trim().min(1, "is required").max(80),
  description: z.string().trim().min(10, "must be at least 10 characters").max(8_000),
  answers: answersSchema,
  importedProject: importedProjectSchema.optional(),
  smartAnswers: z.record(z.string().max(2_000)).optional(),
  detectedCategory: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return apiError("unauthenticated", "Sign in to generate an app.");

  // Rate limit before any DB or AI work — this, not credits, is what caps
  // provider spend if a client loops or a credit check regresses.
  const rate = checkRateLimit(globalRateLimitStore, `generate:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) {
    const seconds = Math.ceil(rate.retryAfterMs / 1000);
    return apiError("rate_limited", `Too many generation requests. Try again in ${seconds}s.`, {
      headers: { "Retry-After": String(seconds) },
      details: { retryAfterSeconds: seconds },
    });
  }

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining, status").eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription) {
    return apiError(
      "account_not_provisioned",
      "Your account is still being set up. Refresh in a moment — if this persists, contact support."
    );
  }

  if (subscription.status === "past_due") {
    return apiError("forbidden", "Your last payment failed. Update your payment method in Billing to keep generating.");
  }

  const userContext = {
    role: profile.role,
    plan: subscription.plan,
    creditsRemaining: subscription.credits_remaining,
  };

  const action = body.importedProject ? "importAndExtendApp" : "generateFullApp";

  const gate = canUseFeature(userContext, action);
  if (!gate.allowed) {
    return apiError(gate.reason === "insufficient_credits" ? "insufficient_credits" : "feature_not_in_plan", gate.message);
  }

  const engineeredContext =
    body.detectedCategory && body.smartAnswers && Object.keys(body.smartAnswers).length > 0
      ? buildEngineeredContext(body.detectedCategory as AppCategory, body.smartAnswers)
      : undefined;

  const generationRequest: GenerateAppRequest = {
    name: body.name,
    description: body.description,
    answers: body.answers,
    importedProject: body.importedProject,
    engineeredContext,
  };

  const admin = createServiceRoleClient();

  // Charge BEFORE the work, refund on failure. Charging afterwards let two
  // concurrent generations both pass the balance check and both run, with
  // only one of them ever being paid for.
  const charge = await chargeCredits(admin, {
    userId: user.id,
    action,
    role: profile.role,
    creditsRemainingHint: subscription.credits_remaining,
  });

  if (!charge.charged) {
    return apiError(
      "insufficient_credits",
      `This generation costs ${charge.amount} credits and your balance is too low. Upgrade or wait for your next renewal.`
    );
  }

  const startedAt = Date.now();
  let appId: string | null = null;

  try {
    const project = await generateApp(generationRequest);

    // The model's output is untrusted input. Reject path traversal, absurd
    // file counts and embedded secrets before any of it is persisted.
    const safety = validateGeneratedProject(project.files);
    if (!safety.ok) {
      // The charge already happened (see above), so this path has to give
      // it back explicitly — the user got nothing usable.
      await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "generated project failed validation" });
      logger.warn("Generated project rejected by safety validation", { route: ROUTE, userId: user.id, reason: safety.reason });
      return apiError(
        "upstream_unavailable",
        `The AI returned a project that failed Appo's safety checks (${safety.reason}). No credits were charged — please try again.`
      );
    }

    const { data: app, error: appError } = await admin
      .from("apps")
      .insert({ user_id: user.id, name: body.name, platforms: body.answers.platforms })
      .select()
      .single();
    if (appError || !app) throw appError ?? new Error("App row could not be created");
    appId = app.id;

    try {
      const artifact = await createReleaseArtifact(app.id, 1, safety.files);
      const { error: versionError } = await admin.from("app_versions").insert({
        app_id: app.id,
        version_number: 1,
        storage_path: artifact.path,
        change_summary: "Initial generation",
        artifact_checksum: artifact.checksum,
        artifact_size_bytes: artifact.sizeBytes,
      });
      if (versionError) throw versionError;
    } catch (artifactError) {
      await admin.from("apps").delete().eq("id", app.id);
      appId = null;
      throw artifactError;
    }

    await Promise.all([
      notify(admin, {
        userId: user.id,
        category: "generation",
        title: `${app.name} is ready`,
        body: project.summary.slice(0, 400),
        href: `/dashboard/apps/${app.id}`,
        severity: "success",
      }),
      recordAudit(admin, {
        userId: user.id,
        action: "project.created",
        resourceType: "app",
        resourceId: app.id,
        metadata: { action, fileCount: safety.files.length, durationMs: Date.now() - startedAt },
      }),
    ]);

    logger.info("Generation completed", {
      route: ROUTE,
      userId: user.id,
      durationMs: Date.now() - startedAt,
      fileCount: safety.files.length,
    });

    return apiOk({
      project: { files: safety.files, summary: project.summary },
      app,
      creditsRemaining: charge.creditsRemaining,
    });
  } catch (error) {
    await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "generation failed" });
    if (appId) await admin.from("apps").delete().eq("id", appId);

    logger.warn("Generation failed", { route: ROUTE, userId: user.id, durationMs: Date.now() - startedAt, error });

    // A provider failure is not our bug — tell the user what happened and
    // that they were not charged, rather than a generic 500.
    const message = error instanceof Error && /provider|timed out|unavailable/i.test(error.message)
      ? "Every AI provider is currently unavailable or rate limited. No credits were charged — please try again shortly."
      : "Generation failed. No credits were charged.";

    return apiError("upstream_unavailable", message);
  }
}
