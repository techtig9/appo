/**
 * Shared types for Appo's transactional email layer.
 *
 * Design rules this layer enforces:
 *  - Resend is only ever reachable from the server. RESEND_API_KEY has no
 *    NEXT_PUBLIC_ prefix and this module must never be imported into a
 *    Client Component.
 *  - A failed email never fails the action that triggered it. Nobody
 *    should be locked out because a mail provider had a bad minute.
 *  - Provider errors are logged, never surfaced to the user verbatim.
 */

export type EmailTemplateId =
  | "welcome"
  | "signup_confirmation"
  | "login_alert"
  | "password_reset"
  | "password_changed"
  | "email_changed"
  | "new_device_login"
  | "subscription_started"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_cancelled"
  | "subscription_renewing"
  | "low_credits"
  | "generation_completed"
  | "deployment_completed"
  | "deployment_failed"
  | "team_invitation"
  | "account_deletion";

/** Which preference column, if any, gates this template. */
export type EmailPreferenceKey =
  | "email_security_alerts"
  | "email_product_updates"
  | "email_billing_alerts"
  | null;

export interface RenderedEmail {
  subject: string;
  html: string;
  /**
   * Plain-text alternative. Not optional: a mail without one scores worse
   * with spam filters and is unreadable in text-only clients.
   */
  text: string;
}

export interface SendEmailInput {
  to: string;
  template: EmailTemplateId;
  rendered: RenderedEmail;
  /**
   * When set, the send is skipped if a row with the same key already
   * exists. This is what stops a single sign-in producing several
   * "new sign-in" emails when Supabase fires more than one auth event.
   */
  dedupeKey?: string;
  userId?: string;
  replyTo?: string;
}

export type SendEmailResult =
  | { status: "sent"; messageId: string | null }
  | { status: "skipped"; reason: "duplicate" | "not_configured" | "opted_out" | "invalid_recipient" }
  | { status: "failed"; reason: string };

/** Context shown in security emails so a user can spot an unexpected sign-in. */
export interface SecurityContext {
  ip?: string | null;
  userAgent?: string | null;
  /** Pre-formatted, e.g. "Chrome on macOS". Derived, never trusted for auth. */
  device?: string | null;
  location?: string | null;
  at: Date;
}
