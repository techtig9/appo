import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_COSTS, type CreditAction } from "./plans";
import type { Database } from "./supabase/types";
import { logger } from "./logger";

/**
 * Server-side credit movement. Everything here goes through the
 * `consume_credits` / `refund_credits` Postgres functions added in
 * supabase/phase-21-migration.sql, which do the balance check and the
 * decrement in a single statement.
 *
 * Why this file exists: the routes used to read `credits_remaining`, do
 * the arithmetic in Node, then write the result back. Two requests that
 * overlapped both read the same starting balance and both wrote the same
 * result, so the second generation was free. Charging is money — it has to
 * be serialised by the database, not by hope.
 *
 * lib/credits.ts remains the pure policy layer (is this action allowed on
 * this plan, what does it cost). This file is the effectful counterpart.
 */

export type AdminClient = SupabaseClient<Database>;

export interface ChargeSuccess {
  charged: true;
  amount: number;
  creditsRemaining: number;
}

export interface ChargeRefused {
  charged: false;
  reason: "insufficient_credits";
  amount: number;
}

export type ChargeResult = ChargeSuccess | ChargeRefused;

export class CreditLedgerError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CreditLedgerError";
  }
}

/**
 * Atomically charges `action` to the user. Admins are never charged, and
 * zero-cost actions short-circuit without a round trip.
 *
 * `creditsRemainingHint` is used only for the admin/zero-cost reply, where
 * no balance change happened — it is never used to compute a new balance.
 */
export async function chargeCredits(
  admin: AdminClient,
  params: {
    userId: string;
    action: CreditAction;
    role: "user" | "admin";
    creditsRemainingHint: number;
  }
): Promise<ChargeResult> {
  const amount = CREDIT_COSTS[params.action];

  if (params.role === "admin" || amount === 0) {
    return { charged: true, amount: 0, creditsRemaining: params.creditsRemainingHint };
  }

  const { data, error } = await admin.rpc("consume_credits", {
    p_user_id: params.userId,
    p_amount: amount,
  });

  if (error) {
    throw new CreditLedgerError("Credit consumption failed", error);
  }

  // The function returns NULL when no row satisfied `credits_remaining >=
  // amount` — i.e. the balance moved between the pre-flight check and the
  // charge. That is a refusal, not a server fault.
  if (data === null || data === undefined) {
    return { charged: false, reason: "insufficient_credits", amount };
  }

  return { charged: true, amount, creditsRemaining: Number(data) };
}

/**
 * Returns credits reserved for work that then failed. Safe to call on a
 * path that may not have charged: `amount === 0` is a no-op.
 *
 * Failures here are logged rather than thrown: a refund failing must not
 * turn a "your build failed" response into a 500, which would hide the
 * original error from the user. The delta is recoverable from the audit
 * log, and the database caps the balance at credits_granted so a retried
 * refund cannot mint credits.
 */
export async function refundCredits(
  admin: AdminClient,
  params: { userId: string; amount: number; reason: string }
): Promise<void> {
  if (params.amount <= 0) return;

  const { error } = await admin.rpc("refund_credits", {
    p_user_id: params.userId,
    p_amount: params.amount,
  });

  if (error) {
    logger.error("Credit refund failed — balance may be short until reconciled", {
      userId: params.userId,
      amount: params.amount,
      reason: params.reason,
      error,
    });
  }
}

/**
 * Reserve-then-settle helper for actions whose real work can fail after
 * the charge (generation, deployment). Charges first so concurrent
 * requests cannot both pass the balance check, then refunds if `work`
 * throws. The alternative — charge only on success — leaves the window
 * this whole file exists to close.
 */
export async function chargeThenRun<T>(
  admin: AdminClient,
  params: { userId: string; action: CreditAction; role: "user" | "admin"; creditsRemainingHint: number },
  work: () => Promise<T>
): Promise<{ result: T; charge: ChargeSuccess } | { result: null; charge: ChargeRefused }> {
  const charge = await chargeCredits(admin, params);
  if (!charge.charged) return { result: null, charge };

  try {
    return { result: await work(), charge };
  } catch (error) {
    await refundCredits(admin, {
      userId: params.userId,
      amount: charge.amount,
      reason: `${params.action} failed`,
    });
    throw error;
  }
}
