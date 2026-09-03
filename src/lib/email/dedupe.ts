import { createHash } from "node:crypto";

/**
 * Pure helpers shared by the email layer.
 *
 * Deliberately NOT under `import "server-only"`: that guard is what keeps
 * RESEND_API_KEY out of the browser bundle, and it makes a module
 * unloadable in a plain Node test process. These functions touch no
 * secrets and no network, so they live here where they can be tested
 * directly, and the guarded modules import them.
 */

/** Window within which repeated sign-in signals count as the same event. */
export const SIGNIN_DEDUPE_WINDOW_MS = 30 * 60 * 1000;

/**
 * A stable key for "this user, signing in this way, from this client,
 * within this window".
 *
 * Supabase can emit several auth state changes for one sign-in
 * (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED), and a page refresh
 * immediately afterwards is indistinguishable server-side. Bucketing by a
 * time window collapses all of those into one email, while a genuinely
 * separate sign-in later in the day still gets its own.
 *
 * The client fingerprint is hashed: this value is only ever compared for
 * equality, so there is no reason to store an address or user agent in it.
 */
export function signInDedupeKey(params: {
  userId: string;
  provider: "password" | "google";
  ip?: string | null;
  userAgent?: string | null;
  now?: number;
  windowMs?: number;
}): string {
  const windowMs = params.windowMs ?? SIGNIN_DEDUPE_WINDOW_MS;
  const bucket = Math.floor((params.now ?? Date.now()) / windowMs);
  const fingerprint = createHash("sha256")
    .update(`${params.ip ?? ""}|${params.userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 16);
  return `signin:${params.userId}:${params.provider}:${fingerprint}:${bucket}`;
}

/** The welcome mail is once per account, for all time. */
export function welcomeDedupeKey(userId: string): string {
  return `welcome:${userId}`;
}

/** Conservative address check — enough to avoid a pointless API round trip. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value) && value.length <= 320;
}
