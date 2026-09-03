import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { handlePasswordChangedEvent } from "@/lib/email/events/auth";
import { apiError, apiOk } from "@/lib/api/responses";
import { checkRateLimit, globalRateLimitStore } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Confirms a password change to the account owner.
 *
 * Takes no body at all — identity comes from the verified session, so a
 * caller cannot use this to send mail to an address they do not control.
 * The actual password change happens through Supabase on the client; this
 * route only records and notifies.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) return apiError("unauthenticated", "No active session.");

  // A password change is rare. This cap makes the endpoint useless as a
  // way to send repeated mail to the account owner.
  const rate = checkRateLimit(globalRateLimitStore, `password-changed:${user.id}`, {
    limit: 3,
    windowMs: 10 * 60 * 1000,
  });
  if (!rate.allowed) return apiOk({ ok: true, notified: false });

  await handlePasswordChangedEvent(createServiceRoleClient(), {
    userId: user.id,
    email: user.email,
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  });

  return apiOk({ ok: true, notified: true });
}
