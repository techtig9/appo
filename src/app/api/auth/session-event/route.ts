import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { handleSignInEvent } from "@/lib/email/events/auth";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, z } from "@/lib/api/validation";
import { checkRateLimit, globalRateLimitStore } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Fires the sign-in notification for flows that complete in the browser
 * (email + password, and the magic-link/recovery landings the browser
 * client resolves itself). OAuth does not use this route — its callback
 * handler already runs on the server and notifies from there.
 *
 * Everything the notification needs is read from the verified session, not
 * from the request body. The client tells us *that* a sign-in happened; it
 * never gets to say who it was, when, or from where. `getUser()` validates
 * the token against Supabase rather than trusting the cookie's contents.
 */

const bodySchema = z.object({
  event: z.enum(["signed_in", "signed_up"]),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return apiError("unauthenticated", "No active session.");

  const parsed = await parseJsonBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  // Cheap guard against a client looping this endpoint. The email layer
  // de-duplicates too, but that costs a database round trip per call.
  const rate = checkRateLimit(globalRateLimitStore, `session-event:${user.id}`, {
    limit: 10,
    windowMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) return apiOk({ ok: true, notified: false, reason: "rate_limited" });

  const admin = createServiceRoleClient();

  const isNewUser =
    parsed.data.event === "signed_up" ||
    (Boolean(user.created_at) && Date.now() - new Date(user.created_at).getTime() < 120_000);

  const result = await handleSignInEvent(admin, {
    userId: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.full_name as string | undefined) ?? (user.user_metadata?.name as string | undefined) ?? null,
    provider: user.app_metadata?.provider === "google" ? "google" : "password",
    isNewUser,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  logger.info("Session event processed", { userId: user.id, emailStatus: result.email.status });

  // The email outcome is reported but never fails the request: the user is
  // already signed in, and a mail provider problem is not their problem.
  return apiOk({ ok: true, notified: result.email.status === "sent" });
}
