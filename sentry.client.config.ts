// Sentry client-side (browser) init. Requires `npm install @sentry/nextjs`
// (already in package.json) and NEXT_PUBLIC_SENTRY_DSN set.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0, // opt in later if you want session replay — off by default for privacy/cost
  replaysOnErrorSampleRate: 0.1,
});
