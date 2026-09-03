import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";
import { logger, redact } from "./logger";

/**
 * Append-only record of security- and money-relevant actions. Written with
 * the service role only, so a user cannot forge or delete their own
 * history — that is the entire point of an audit log.
 */

export type AuditAction =
  | "auth.signin"
  | "auth.signin.oauth"
  | "auth.signup"
  | "auth.signout"
  | "auth.password_reset_requested"
  | "auth.password_changed"
  | "auth.email_changed"
  | "account.profile_updated"
  | "account.deleted"
  | "account.exported"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.shared"
  | "project.rolled_back"
  | "deployment.created"
  | "deployment.rolled_back"
  | "billing.subscription_changed"
  | "billing.payment_failed"
  | "billing.cancelled"
  | "team.invited"
  | "team.role_changed"
  | "team.removed"
  | "admin.action";

/**
 * IP addresses are personal data under GDPR and are not needed in
 * plaintext to answer "was this the same client as last time?". A salted
 * hash answers that question without storing the address itself.
 */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.APPO_IP_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "appo-local-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export interface AuditEntry {
  userId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Never throws and never rejects: an audit write failing must not turn a
 * successful sign-in into an error for the user. Failures are logged so
 * they are still visible in monitoring.
 */
export async function recordAudit(
  admin: SupabaseClient<Database>,
  entry: AuditEntry
): Promise<void> {
  try {
    const { error } = await admin.from("audit_logs").insert({
      user_id: entry.userId ?? null,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      ip_hash: hashIp(entry.ip),
      user_agent: entry.userAgent?.slice(0, 400) ?? null,
      metadata: (redact(entry.metadata ?? {}) as Record<string, unknown>),
    });
    if (error) logger.warn("Audit log write failed", { action: entry.action, error });
  } catch (error) {
    logger.warn("Audit log write threw", { action: entry.action, error });
  }
}
