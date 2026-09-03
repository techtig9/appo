/**
 * Post-authentication redirect targets.
 *
 * Lives here rather than in the callback route because a Next.js
 * `route.ts` may only export HTTP handlers and route config — exporting a
 * helper from one fails the build. It also means the open-redirect rule
 * is unit-testable without invoking a route handler.
 */

export const DEFAULT_POST_LOGIN_PATH = "/dashboard";

/** Control characters can be used to split a Location header. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/**
 * Returns a safe same-origin path, or the default.
 *
 * `?next=` is fully attacker-controlled (it appears in any link that can
 * be sent to a user), so an unchecked value turns the callback into an
 * open redirect: a phishing page could send someone through a genuine
 * Appo sign-in and then bounce them to a lookalike site, carrying the
 * trust of having really just authenticated.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_POST_LOGIN_PATH;

  const value = raw.trim();
  if (!value.startsWith("/")) return DEFAULT_POST_LOGIN_PATH;
  // `//evil.com` and `/\evil.com` are protocol-relative URLs in browsers.
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_POST_LOGIN_PATH;
  if (value.includes("\\") || value.includes("://")) return DEFAULT_POST_LOGIN_PATH;
  if (CONTROL_CHARS.test(value)) return DEFAULT_POST_LOGIN_PATH;
  // Never bounce back into the auth flow itself — that is how a redirect
  // loop starts.
  if (value.startsWith("/auth/")) return DEFAULT_POST_LOGIN_PATH;

  return value;
}
