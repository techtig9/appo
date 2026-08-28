const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

// withSentryConfig no-ops safely if SENTRY_AUTH_TOKEN/org/project aren't
// set — source maps just won't upload, error reporting still works as
// long as NEXT_PUBLIC_SENTRY_DSN is set. See .env.example.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
