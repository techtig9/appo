// Sentry server-side init. Requires `npm install @sentry/nextjs` (already
// in package.json) and NEXT_PUBLIC_SENTRY_DSN set in the environment.
// Auto-loaded by Next.js via the instrumentation hook — see next.config.js.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  // Keep noisy, low-value events out of your quota.
  ignoreErrors: ["Not authenticated"],
});
