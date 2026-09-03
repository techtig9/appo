import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { reportError } from "@/lib/error-reporting";

/**
 * Stable machine-readable error codes. The UI switches on `code` to decide
 * what to show and what recovery action to offer; `error` is the
 * human-readable sentence and is the only part safe to render verbatim.
 * Nothing here ever carries a stack trace or an upstream provider body.
 */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_request"
  | "rate_limited"
  | "conflict"
  | "insufficient_credits"
  | "feature_not_in_plan"
  | "account_not_provisioned"
  | "upstream_unavailable"
  | "internal_error";

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  rate_limited: 429,
  conflict: 409,
  insufficient_credits: 402,
  feature_not_in_plan: 403,
  account_not_provisioned: 409,
  upstream_unavailable: 503,
  internal_error: 500,
};

export interface ApiErrorOptions {
  /** Extra machine-readable detail — never free-form upstream text. */
  details?: Record<string, unknown>;
  headers?: Record<string, string>;
  status?: number;
}

export function apiError(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
  return NextResponse.json(
    { error: message, code, ...(options.details ? { details: options.details } : {}) },
    { status: options.status ?? STATUS_FOR_CODE[code], headers: options.headers }
  );
}

export function apiOk<T extends Record<string, unknown>>(payload: T, init?: ResponseInit) {
  return NextResponse.json(payload, init);
}

/**
 * The single place an unexpected server-side failure turns into a
 * response. Logs and reports the real error with full context, returns a
 * generic sentence to the caller. Leaking `err.message` here is how
 * database column names and provider URLs end up in a browser console.
 */
export function apiInternalError(error: unknown, context: { route: string; userId?: string; requestId?: string }) {
  logger.error("Unhandled route error", { ...context, error });
  reportError(error, context);
  return apiError("internal_error", "Something went wrong on our side. Please try again — if it keeps happening, contact support.");
}
