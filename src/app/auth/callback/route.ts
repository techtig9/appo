import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { handleSignInEvent } from "@/lib/email/events/auth";
import { logger } from "@/lib/logger";
import { safeRedirectPath } from "@/lib/auth/redirect";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * OAuth / email-link callback.
 *
 * THIS ROUTE IS THE FIX FOR THE "Continue with Google" WHITE PAGE.
 *
 * What was happening: the login page called
 * `signInWithOAuth({ provider: "google" })` with no `redirectTo`, and no
 * callback route existed anywhere in the app. `@supabase/ssr` uses the
 * PKCE flow, so Google → Supabase → the site's configured URL with
 * `?code=...` appended. That landing URL was a Server Component with
 * nothing that exchanges the code, so the code was silently dropped: no
 * session cookie was ever written, the middleware bounced the user back,
 * and the visible result was a blank page or a redirect loop.
 *
 * The exchange has to happen server-side in a Route Handler, because that
 * is the only place the session cookie can be set on the response before
 * the browser follows the next navigation.
 *
 * Every branch below ends in a redirect to a page that explains itself.
 * There is no path that renders nothing, spins forever, or leaves the
 * user on a URL containing an authorization code.
 */

function errorRedirect(request: NextRequest, reason: string, description?: string | null) {
  const url = new URL("/auth/auth-code-error", request.url);
  url.searchParams.set("reason", reason);
  if (description) url.searchParams.set("description", description.slice(0, 200));
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next") ?? searchParams.get("redirectTo"));

  // The user pressed "Cancel" on Google's consent screen, or the provider
  // refused. Both arrive as ?error=..., never as a code.
  const providerError = searchParams.get("error");
  if (providerError) {
    const description = searchParams.get("error_description");
    logger.info("OAuth callback returned a provider error", { providerError });
    if (providerError === "access_denied") {
      // A deliberate cancellation is not a failure — send them back to
      // the login page rather than an error screen.
      const url = new URL("/login", request.url);
      url.searchParams.set("notice", "cancelled");
      return NextResponse.redirect(url);
    }
    return errorRedirect(request, "provider_error", description);
  }

  if (!code) {
    // Someone opened /auth/callback directly, or a link was truncated.
    return errorRedirect(request, "missing_code");
  }

  // The response object has to exist before the exchange so the Supabase
  // client can write session cookies onto it. Building the redirect first
  // and mutating its cookies is what actually persists the session.
  const response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user) {
    // Expired code, already-used code, or a PKCE verifier mismatch (which
    // happens when the sign-in was started in a different browser).
    logger.warn("OAuth code exchange failed", { message: error?.message });
    return errorRedirect(request, "exchange_failed");
  }

  const user = data.user;
  const provider = user.app_metadata?.provider === "google" ? "google" : "password";

  try {
    const admin = createServiceRoleClient();

    // The database trigger provisions users/subscriptions on auth.users
    // insert. This is a safety net for accounts created before that
    // trigger existed, and for the case where a Google profile carries a
    // name/avatar the trigger could not see. Without it, a first Google
    // login lands on a dashboard whose every query returns "Account not
    // fully provisioned".
    await ensureProfileProvisioned(admin, {
      id: user.id,
      email: user.email ?? "",
      name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        null,
      avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
    });

    // A user created within the last two minutes is treated as new, so a
    // first Google sign-in gets the welcome mail rather than a security
    // alert about an account that did not exist a moment ago.
    const isNewUser = Boolean(user.created_at) && Date.now() - new Date(user.created_at).getTime() < 120_000;

    // Awaited rather than fire-and-forget: on serverless the invocation
    // can be frozen the instant the response is returned, which silently
    // drops detached work. The cost is a few hundred milliseconds on the
    // redirect; the alternative is emails that never arrive.
    await handleSignInEvent(admin, {
      userId: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
      provider,
      isNewUser,
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
    });
  } catch (postAuthError) {
    // The session is already valid at this point. Provisioning or
    // notification problems are logged, but must never cost the user a
    // sign-in they just completed successfully.
    logger.error("Post-authentication work failed after a successful sign-in", {
      userId: user.id,
      error: postAuthError,
    });
  }

  return response;
}

async function ensureProfileProvisioned(
  admin: ReturnType<typeof createServiceRoleClient>,
  profile: { id: string; email: string; name: string | null; avatarUrl: string | null }
): Promise<void> {
  const { data: existing } = await admin.from("users").select("id, name, avatar_url").eq("id", profile.id).maybeSingle();

  if (!existing) {
    await admin.from("users").insert({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatarUrl,
    });
    await admin.from("subscriptions").insert({
      user_id: profile.id,
      plan: "free",
      credits_remaining: 2000,
      credits_granted: 2000,
    });
    return;
  }

  // Backfill only — never overwrite a name the user has since edited.
  const patch: Record<string, string> = {};
  if (!existing.name && profile.name) patch.name = profile.name;
  if (!existing.avatar_url && profile.avatarUrl) patch.avatar_url = profile.avatarUrl;
  if (Object.keys(patch).length > 0) {
    await admin.from("users").update(patch).eq("id", profile.id);
  }

  // An account can exist in public.users with no subscription row if it
  // was created before the provisioning trigger. Every credit check
  // depends on that row.
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (!subscription) {
    await admin.from("subscriptions").insert({
      user_id: profile.id,
      plan: "free",
      credits_remaining: 2000,
      credits_granted: 2000,
    });
  }
}
