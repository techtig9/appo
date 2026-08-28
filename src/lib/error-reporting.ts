/**
 * Single call site for error reporting across the app. Wraps Sentry so
 * routes never import @sentry/nextjs directly — if Sentry isn't
 * configured (no DSN set, or not installed yet), this degrades to
 * console.error instead of throwing, so it's always safe to call.
 *
 * Requires `npm install @sentry/nextjs` (already in package.json) and
 * NEXT_PUBLIC_SENTRY_DSN set — see sentry.server.config.ts and
 * sentry.client.config.ts at the project root for the SDK init, which
 * this sandbox can't install/verify (no network access).
 */

interface ErrorContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

export function reportError(error: unknown, context?: ErrorContext): void {
  // Dynamic require rather than a static import so this file doesn't hard
  // -fail to even parse in environments where @sentry/nextjs isn't
  // installed yet (e.g. this offline sandbox).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/nextjs");
    if (Sentry?.captureException) {
      Sentry.captureException(error, { extra: context });
      return;
    }
  } catch {
    // @sentry/nextjs not installed/available — fall through to console.
  }

  console.error(context?.route ? `[${context.route}]` : "[error]", error, context ?? "");
}
