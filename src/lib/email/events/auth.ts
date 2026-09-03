import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { sendEmail } from "../resend";
import { signInDedupeKey, welcomeDedupeKey } from "../dedupe";
import { describeDevice } from "../render";
import { loginAlertEmail, welcomeEmail, passwordChangedEmail, accountDeletionEmail } from "../templates";
import type { SecurityContext, SendEmailResult } from "../types";
import { notify } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Authentication email events.
 *
 * The requirement is one notification per logical sign-in. Supabase can
 * emit several auth state changes for a single sign-in (INITIAL_SESSION,
 * SIGNED_IN, TOKEN_REFRESHED), and a page refresh right after signing in
 * looks identical from the server. Bucketing the dedupe key by a time
 * window collapses all of those into one email while still notifying a
 * genuinely separate sign-in later in the day.
 */

export interface SignInEventParams {
  userId: string;
  email: string;
  name?: string | null;
  provider: "password" | "google";
  isNewUser?: boolean;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Handles everything that should happen when a user signs in: the in-app
 * notification, the audit entry, and (subject to their preferences) the
 * security email.
 *
 * Never throws. A sign-in has already succeeded by the time this runs —
 * failing here would mean a working session and a 500 response.
 */
export async function handleSignInEvent(
  admin: SupabaseClient<Database>,
  params: SignInEventParams
): Promise<{ email: SendEmailResult }> {
  const context: SecurityContext = {
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    device: describeDevice(params.userAgent),
    at: new Date(),
  };

  try {
    await recordAudit(admin, {
      userId: params.userId,
      actorEmail: params.email,
      action: params.provider === "google" ? "auth.signin.oauth" : "auth.signin",
      ip: params.ip,
      userAgent: params.userAgent,
      metadata: { provider: params.provider, isNewUser: Boolean(params.isNewUser) },
    });

    // Was this device seen before? Purely informational for the email copy;
    // a "no" never blocks the sign-in.
    const isNewDevice = await isUnfamiliarDevice(admin, params);

    const { data: profile } = await admin
      .from("users")
      .select("email_security_alerts, name")
      .eq("id", params.userId)
      .maybeSingle();

    // Security alerts are opt-out, and even then only for the routine
    // case: an unfamiliar device is always worth telling someone about.
    const wantsAlert = profile?.email_security_alerts !== false || isNewDevice;
    const displayName = params.name ?? profile?.name ?? null;

    if (params.isNewUser) {
      await notify(admin, {
        userId: params.userId,
        category: "auth",
        title: "Welcome to Appo",
        body: "Your account is ready. Describe an app to get started.",
        href: "/dashboard/get-started",
        severity: "success",
      });

      const welcome = await sendEmail(admin, {
        to: params.email,
        userId: params.userId,
        template: "welcome",
        dedupeKey: welcomeDedupeKey(params.userId),
        rendered: welcomeEmail({ name: displayName }),
      });
      // A brand-new account does not also need a "new sign-in" alert —
      // the welcome email covers the same event.
      return { email: welcome };
    }

    await notify(admin, {
      userId: params.userId,
      category: "auth",
      title: isNewDevice ? "New sign-in from an unrecognised device" : "New sign-in to your account",
      body: context.device ? `Signed in with ${params.provider === "google" ? "Google" : "your password"} on ${context.device}.` : undefined,
      href: "/dashboard/settings",
      severity: isNewDevice ? "warning" : "info",
    });

    if (!wantsAlert) return { email: { status: "skipped", reason: "opted_out" } };

    const result = await sendEmail(admin, {
      to: params.email,
      userId: params.userId,
      template: isNewDevice ? "new_device_login" : "login_alert",
      dedupeKey: signInDedupeKey({
        userId: params.userId,
        provider: params.provider,
        ip: params.ip,
        userAgent: params.userAgent,
      }),
      rendered: loginAlertEmail({ name: displayName, provider: params.provider, isNewDevice, context }),
    });

    return { email: result };
  } catch (error) {
    logger.error("Sign-in event handling failed", { userId: params.userId, error });
    return { email: { status: "failed", reason: "event handling error" } };
  }
}

/**
 * True when this user has no prior audit entry from the same hashed
 * client. Falls back to "familiar" on any error — a false "new device"
 * warning is worse than a missing one, because it teaches people to
 * ignore the alert.
 */
async function isUnfamiliarDevice(
  admin: SupabaseClient<Database>,
  params: SignInEventParams
): Promise<boolean> {
  if (!params.userAgent && !params.ip) return false;
  try {
    const { hashIp } = await import("@/lib/audit");
    const ipHash = hashIp(params.ip);
    if (!ipHash) return false;

    const { data, error } = await admin
      .from("audit_logs")
      .select("id")
      .eq("user_id", params.userId)
      .in("action", ["auth.signin", "auth.signin.oauth"])
      .eq("ip_hash", ipHash)
      .limit(2);

    if (error) return false;
    // The entry written moments ago by this same sign-in is one of them,
    // so "familiar" means more than one.
    return (data?.length ?? 0) <= 1;
  } catch {
    return false;
  }
}

export async function handlePasswordChangedEvent(
  admin: SupabaseClient<Database>,
  params: { userId: string; email: string; ip?: string | null; userAgent?: string | null }
): Promise<void> {
  const context: SecurityContext = {
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
    device: describeDevice(params.userAgent),
    at: new Date(),
  };

  await Promise.all([
    recordAudit(admin, {
      userId: params.userId,
      actorEmail: params.email,
      action: "auth.password_changed",
      ip: params.ip,
      userAgent: params.userAgent,
    }),
    notify(admin, {
      userId: params.userId,
      category: "auth",
      title: "Your password was changed",
      href: "/dashboard/settings",
      severity: "warning",
    }),
    // Not gated on email_security_alerts: a password change is the single
    // most important thing to tell an account owner about.
    sendEmail(admin, {
      to: params.email,
      userId: params.userId,
      template: "password_changed",
      dedupeKey: `password-changed:${params.userId}:${Math.floor(Date.now() / 60_000)}`,
      rendered: passwordChangedEmail({ context }),
    }),
  ]);
}

export async function handleAccountDeletedEvent(
  admin: SupabaseClient<Database>,
  params: { userId: string; email: string; name?: string | null }
): Promise<void> {
  // Deliberately sent without a userId link: the user row is being
  // removed, and a foreign key to a deleted row would fail the insert.
  await sendEmail(admin, {
    to: params.email,
    template: "account_deletion",
    rendered: accountDeletionEmail({ name: params.name ?? null }),
  });
}
