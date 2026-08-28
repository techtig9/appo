# Appo Phase 13 — Billing & Monetization Hardening

## Added
- Real Paddle checkout initialization on the billing page when production/sandbox credentials are configured.
- Server-authenticated `/api/billing/config` endpoint that exposes only the public client token, environment, and configured Paddle price IDs.
- Polished plans & usage billing experience.
- Current-plan and subscription-status presentation.
- Renewal-date presentation when available.
- Credit usage health states and improved visual meter.
- Plan comparison cards and clearer upgrade CTA.
- Safe checkout fallback when Paddle credentials are not configured.
- Reusable billing utility functions with unit tests.
- Paddle checkout environment variables documented in `.env.example`.

## Existing behavior preserved
- Existing subscription API and Paddle webhook flow remain intact.
- Existing cancellation semantics remain unchanged.
- Subscription state remains authoritative in Supabase and verified Paddle webhooks.
- No database migration is required.
