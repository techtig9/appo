import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, z } from "@/lib/api/validation";
import { handleAccountDeletedEvent } from "@/lib/email/events/auth";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/error-reporting";

export const dynamic = "force-dynamic";

/**
 * Self-serve account deletion (GDPR/CCPA right to erasure — see Privacy
 * Policy §4).
 *
 * The confirmation was previously checked only in the Settings page, which
 * means anything that could make a same-origin POST could delete an
 * account outright. It is now re-checked server-side against the session's
 * own email: client-side validation is a convenience, never a control.
 *
 * Order matters. Data rows go first (app_versions/deployments cascade from
 * apps), then the profile, then the Supabase Auth user. Deleting the auth
 * user first would leave rows whose owner no longer exists.
 */

const bodySchema = z.object({
  /** The user must retype their own email address to confirm. */
  confirmEmail: z.string().trim().toLowerCase().min(1, "is required"),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return apiError("unauthenticated", "Sign in to delete your account.");

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  if (parsed.data.confirmEmail !== user.email.toLowerCase()) {
    return apiError("invalid_request", "The email you typed doesn't match the address on this account.");
  }

  const admin = createServiceRoleClient();

  // Read the profile before anything is removed — the deletion email needs
  // a name, and there will be no row to read it from afterwards.
  const { data: profile } = await admin.from("users").select("name, email").eq("id", user.id).maybeSingle();

  // Audit first, for the same reason: audit_logs.user_id is ON DELETE SET
  // NULL, so the entry survives with actor_email intact.
  await recordAudit(admin, {
    userId: user.id,
    actorEmail: user.email,
    action: "account.deleted",
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  const { error: appsError } = await admin.from("apps").delete().eq("user_id", user.id);
  if (appsError) {
    logger.error("Account deletion failed while removing projects", { userId: user.id, error: appsError });
    return apiError("internal_error", "We couldn't delete your projects. Nothing has been removed — please contact support.");
  }

  await admin.from("notifications").delete().eq("user_id", user.id);
  await admin.from("subscriptions").delete().eq("user_id", user.id);
  await admin.from("payments").delete().eq("user_id", user.id);
  await admin.from("users").delete().eq("id", user.id);

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    // Row data is already gone — log loudly rather than silently leaving an
    // orphaned auth-only account that can still sign in to a broken app.
    reportError(authError, { route: "/api/account/delete", userId: user.id });
    return apiError(
      "internal_error",
      "Your data was deleted, but the login itself couldn't be removed. Contact support and we'll finish it."
    );
  }

  // Sent last, and only on full success, so nobody is told their account
  // is gone while part of it is still there.
  await handleAccountDeletedEvent(admin, {
    userId: user.id,
    email: profile?.email ?? user.email,
    name: profile?.name ?? null,
  });

  logger.info("Account deleted", { userId: user.id });
  return apiOk({ deleted: true });
}
