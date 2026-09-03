import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { recordAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Server-side sign-out.
 *
 * Signing out purely in the browser leaves the httpOnly session cookie in
 * place until it expires, so the next server render still sees a logged-in
 * user — which shows up as "I signed out but the dashboard still loads".
 * Doing it here means the cookie is cleared on the response.
 *
 * GET is supported because the command palette navigates to this URL, and
 * POST because forms and fetch callers use it. Both do the same thing.
 */
async function signOut(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordAudit(createServiceRoleClient(), {
      userId: user.id,
      actorEmail: user.email ?? null,
      action: "auth.signout",
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
  }

  // `scope: "local"` ends this browser's session only. A global sign-out
  // would log the user out of every device, which is a different action
  // and belongs behind its own explicit control in Settings.
  await supabase.auth.signOut({ scope: "local" });

  return NextResponse.redirect(new URL("/login?notice=signed-out", request.url), {
    // 303 so a POST is followed as a GET rather than replayed.
    status: 303,
  });
}

export async function GET(request: NextRequest) {
  return signOut(request);
}

export async function POST(request: NextRequest) {
  return signOut(request);
}
