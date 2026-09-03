import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchWithTimeout } from "@/lib/http/fetch-with-timeout";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/types";
import { isPlausibleEmail } from "./dedupe";
import type { SendEmailInput, SendEmailResult } from "./types";

/**
 * Resend transport.
 *
 * Uses the REST API over fetch rather than the `resend` SDK: the payload is
 * one JSON POST, and this way the timeout, the redaction and the delivery
 * bookkeeping all live in one readable place with no extra dependency.
 *
 * `import "server-only"` is load-bearing — it turns "don't import this into
 * a Client Component" from a comment into a build error, which is the only
 * reliable way to keep RESEND_API_KEY out of the browser bundle.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

export interface ResendConfig {
  apiKey: string;
  from: string;
}

export function resendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Appo <notifications@appo.app>";
  return { apiKey, from };
}

export function isEmailConfigured(): boolean {
  return resendConfig() !== null;
}

/**
 * Sends one email and records the attempt.
 *
 * Never throws. Every caller is on a success path for the user (they just
 * signed in, they just deployed) and an email provider hiccup must not
 * turn that into a failure. The result is returned so callers can log it,
 * not so they can fail on it.
 */
export async function sendEmail(
  admin: SupabaseClient<Database>,
  input: SendEmailInput
): Promise<SendEmailResult> {
  const config = resendConfig();

  if (!isPlausibleEmail(input.to)) {
    logger.warn("Email skipped: implausible recipient", { template: input.template });
    return { status: "skipped", reason: "invalid_recipient" };
  }

  if (!config) {
    // Not an error in development, and not something to hide in
    // production: without this log a "why did no email arrive?" report has
    // no trail at all.
    logger.warn("Email skipped: RESEND_API_KEY is not configured", { template: input.template });
    await recordDelivery(admin, input, "skipped", null, "RESEND_API_KEY not configured");
    return { status: "skipped", reason: "not_configured" };
  }

  // Claim the dedupe key BEFORE sending. Doing it after would leave a
  // window in which two concurrent sign-in events both send. The unique
  // index on email_deliveries.dedupe_key is what makes the claim atomic.
  if (input.dedupeKey) {
    const claimed = await claimDedupeKey(admin, input);
    if (!claimed) {
      logger.debug("Email skipped: duplicate within dedupe window", { template: input.template });
      return { status: "skipped", reason: "duplicate" };
    }
  }

  try {
    const res = await fetchWithTimeout(RESEND_ENDPOINT, {
      method: "POST",
      timeoutMs: SEND_TIMEOUT_MS,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.rendered.subject,
        html: input.rendered.html,
        text: input.rendered.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      // Deliberately not surfaced to the user: a provider body can name
      // internal domains and quota details.
      const detail = (await res.text()).slice(0, 200);
      logger.error("Resend rejected an email", { template: input.template, status: res.status, detail });
      await updateDelivery(admin, input, "failed", null, `HTTP ${res.status}`);
      return { status: "failed", reason: `provider returned ${res.status}` };
    }

    const payload = (await res.json().catch(() => null)) as { id?: string } | null;
    await updateDelivery(admin, input, "sent", payload?.id ?? null, null);
    logger.info("Email sent", { template: input.template, messageId: payload?.id ?? null });
    return { status: "sent", messageId: payload?.id ?? null };
  } catch (error) {
    logger.error("Email send threw", { template: input.template, error });
    await updateDelivery(admin, input, "failed", null, error instanceof Error ? error.name : "unknown");
    return { status: "failed", reason: "transport error" };
  }
}

/**
 * Inserts the delivery row that owns the dedupe key. Returns false when
 * another request already holds it (unique violation 23505).
 */
async function claimDedupeKey(admin: SupabaseClient<Database>, input: SendEmailInput): Promise<boolean> {
  const { error } = await admin.from("email_deliveries").insert({
    user_id: input.userId ?? null,
    recipient: input.to,
    template: input.template,
    dedupe_key: input.dedupeKey,
    status: "queued",
  });

  if (!error) return true;
  if (error.code === "23505") return false;

  // A database problem must not block the email — log and send anyway.
  logger.warn("Could not claim email dedupe key; sending without de-duplication", {
    template: input.template,
    error,
  });
  return true;
}

async function recordDelivery(
  admin: SupabaseClient<Database>,
  input: SendEmailInput,
  status: "sent" | "failed" | "skipped",
  messageId: string | null,
  errorDetail: string | null
): Promise<void> {
  try {
    await admin.from("email_deliveries").insert({
      user_id: input.userId ?? null,
      recipient: input.to,
      template: input.template,
      dedupe_key: input.dedupeKey ?? null,
      provider_message_id: messageId,
      status,
      error_detail: errorDetail,
    });
  } catch (error) {
    logger.warn("Email delivery bookkeeping failed", { template: input.template, error });
  }
}

async function updateDelivery(
  admin: SupabaseClient<Database>,
  input: SendEmailInput,
  status: "sent" | "failed",
  messageId: string | null,
  errorDetail: string | null
): Promise<void> {
  if (!input.dedupeKey) {
    await recordDelivery(admin, input, status, messageId, errorDetail);
    return;
  }
  try {
    await admin
      .from("email_deliveries")
      .update({ status, provider_message_id: messageId, error_detail: errorDetail })
      .eq("dedupe_key", input.dedupeKey);
  } catch (error) {
    logger.warn("Email delivery bookkeeping failed", { template: input.template, error });
  }
}
