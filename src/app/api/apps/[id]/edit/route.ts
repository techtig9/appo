import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature } from "@/lib/credits";
import { chargeCredits, refundCredits } from "@/lib/credits-ledger";
import { generateApp } from "@/lib/gemini";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { createReleaseArtifact, readReleaseArtifact } from "@/lib/release-artifact";
import { validateGeneratedProject } from "@/lib/generated-project-safety";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, z } from "@/lib/api/validation";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Conversational project edit: apply one focused change to the existing
 * project and record it as a new immutable version.
 *
 * Three defects were fixed here, all of which made the feature either
 * broken or dishonest:
 *
 * 1. The app lookup selected a `description` column that does not exist on
 *    `apps`. PostgREST rejects the whole select, so `app` came back null
 *    and EVERY edit request returned "App not found." The feature could
 *    never have worked. The minimal Database type in lib/supabase/types.ts
 *    does not type `.select()` strings, so TypeScript did not catch it.
 *
 * 2. The existing project source was never loaded. `importedProject` was
 *    passed a bare ref with no `files`, so the model regenerated the whole
 *    app from a one-line description and silently discarded every earlier
 *    change — the opposite of "preserve unrelated functionality".
 *
 * 3. The next version number came from a stale read and credits were a
 *    read-modify-write, so two concurrent edits produced two rows claiming
 *    the same version number and were charged once between them.
 */

const bodySchema = z.object({
  instruction: z
    .string()
    .trim()
    .min(4, "must describe the change you want")
    .max(2000, "must be 2,000 characters or fewer"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to edit this project.");

  const rate = checkRateLimit(globalRateLimitStore, `edit:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) {
    const seconds = Math.ceil(rate.retryAfterMs / 1000);
    return apiError("rate_limited", `Too many edit requests. Try again in ${seconds}s.`, {
      headers: { "Retry-After": String(seconds) },
    });
  }

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;
  const { instruction } = parsed.data;

  const { data: app } = await supabase
    .from("apps")
    .select("id, name, platforms, user_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!app) return apiError("not_found", "That project doesn't exist, or you don't have access to it.");

  // Authorisation is server-side and re-derived here rather than trusted
  // from the client: owner, or an explicit editor collaborator.
  let role: "owner" | "editor" | "viewer" | null = app.user_id === user.id ? "owner" : null;
  if (!role) {
    const { data: collaborator } = await supabase
      .from("app_collaborators")
      .select("role")
      .eq("app_id", app.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = collaborator?.role === "editor" ? "editor" : collaborator?.role === "viewer" ? "viewer" : null;
  }
  if (!role) return apiError("forbidden", "You don't have access to this project.");
  if (role === "viewer") return apiError("forbidden", "Viewer access is read-only. Ask the owner for editor access.");

  const [{ data: profile }, { data: subscription }, { data: latest }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining, status").eq("user_id", user.id).single(),
    supabase
      .from("app_versions")
      .select("version_number, storage_path")
      .eq("app_id", app.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!profile || !subscription) return apiError("account_not_provisioned", "Your account is still being set up.");
  if (subscription.status === "past_due") {
    return apiError("forbidden", "Your last payment failed. Update your payment method in Billing to keep editing.");
  }
  if (!latest?.storage_path) {
    return apiError("conflict", "This project has no generated version yet. Generate it before asking for an edit.");
  }

  const context = {
    role: profile.role,
    plan: subscription.plan,
    creditsRemaining: subscription.credits_remaining,
  } as const;

  const gate = canUseFeature(context, "updateExistingScreen");
  if (!gate.allowed) {
    return apiError(gate.reason === "insufficient_credits" ? "insufficient_credits" : "feature_not_in_plan", gate.message);
  }

  const admin = createServiceRoleClient();

  // Charge first, refund on failure — same reasoning as /api/generate.
  const charge = await chargeCredits(admin, {
    userId: user.id,
    action: "updateExistingScreen",
    role: profile.role,
    creditsRemainingHint: subscription.credits_remaining,
  });
  if (!charge.charged) {
    return apiError("insufficient_credits", `This edit costs ${charge.amount} credits and your balance is too low.`);
  }

  const startedAt = Date.now();

  try {
    // The actual current source, so the model edits the project rather
    // than reinventing it.
    const existingFiles = await readReleaseArtifact(latest.storage_path);
    if (existingFiles.length === 0) {
      await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "no source to edit" });
      return apiError("conflict", "The stored source for this version couldn't be read. Generate a new version first.");
    }

    const project = await generateApp({
      name: app.name,
      description:
        `Apply exactly one focused change to the existing application below.\n\n` +
        `CHANGE REQUEST:\n${instruction}\n\n` +
        `Preserve all unrelated files and behaviour. Return the complete updated project.`,
      answers: {
        platforms: (app.platforms?.length ? app.platforms : ["web"]) as ("ios" | "android" | "web")[],
        coreScreens: [],
        navigationPattern: "tabs",
        needsBackend: true,
        colorTheme: "preserve the existing theme",
        authentication: "none",
        database: "none",
        apiStyle: "none",
        fileStorage: false,
      },
      importedProject: { source: "zip", ref: `app:${app.id}:v${latest.version_number}`, files: existingFiles },
    });

    const safety = validateGeneratedProject(project.files);
    if (!safety.ok) {
      await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "edit failed validation" });
      return apiError(
        "upstream_unavailable",
        `The edited project failed Appo's safety checks (${safety.reason}). No credits were charged and your project is unchanged.`
      );
    }

    // Claim the version number with the insert itself rather than
    // computing it from an earlier read: two concurrent edits previously
    // both wrote "version 3". The retry loop resolves the race using the
    // unique index added in phase-21-migration.sql.
    const version = await insertNextVersion(admin, {
      appId: app.id,
      startAt: latest.version_number + 1,
      files: safety.files,
      changeSummary: instruction,
    });

    await Promise.all([
      notify(admin, {
        userId: app.user_id,
        category: "generation",
        title: `${app.name} updated to v${version.version_number}`,
        body: instruction.slice(0, 200),
        href: `/dashboard/apps/${app.id}`,
        severity: "success",
      }),
      recordAudit(admin, {
        userId: user.id,
        action: "project.updated",
        resourceType: "app",
        resourceId: app.id,
        metadata: { version: version.version_number, actorRole: role, fileCount: safety.files.length },
      }),
    ]);

    logger.info("AI edit applied", {
      route: "/api/apps/[id]/edit",
      userId: user.id,
      durationMs: Date.now() - startedAt,
      version: version.version_number,
    });

    return apiOk({
      version,
      project: { files: safety.files, summary: project.summary },
      creditsRemaining: charge.creditsRemaining,
    });
  } catch (error) {
    await refundCredits(admin, { userId: user.id, amount: charge.amount, reason: "edit failed" });
    logger.warn("AI edit failed", { route: "/api/apps/[id]/edit", userId: user.id, error });
    return apiError("upstream_unavailable", "The AI edit didn't complete. No credits were charged and your project is unchanged.");
  }
}

/**
 * Inserts a new version, walking the number forward on a unique-violation
 * so a concurrent edit cannot produce two rows claiming the same version.
 */
async function insertNextVersion(
  admin: ReturnType<typeof createServiceRoleClient>,
  params: { appId: string; startAt: number; files: { path: string; content: string }[]; changeSummary: string }
) {
  let versionNumber = params.startAt;

  for (let attempt = 0; attempt < 5; attempt++) {
    const artifact = await createReleaseArtifact(params.appId, versionNumber, params.files);
    const { data, error } = await admin
      .from("app_versions")
      .insert({
        app_id: params.appId,
        version_number: versionNumber,
        storage_path: artifact.path,
        change_summary: params.changeSummary,
        artifact_checksum: artifact.checksum,
        artifact_size_bytes: artifact.sizeBytes,
      })
      .select()
      .single();

    if (!error && data) return data;
    if (error?.code !== "23505") throw error ?? new Error("Version could not be recorded");

    // Someone else took this number while we were uploading. Re-read the
    // high-water mark rather than blindly incrementing.
    const { data: current } = await admin
      .from("app_versions")
      .select("version_number")
      .eq("app_id", params.appId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    versionNumber = (current?.version_number ?? versionNumber) + 1;
  }

  throw new Error("Could not allocate a version number after several attempts");
}
