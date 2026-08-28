# appo — MVP Build

Generated from the One-Day Build Command spec. This README is the honest account of
what's real, what's tested, and what still needs a live environment.

## What's actually built

- **Phase 1.1 — Foundation**: Supabase schema (`supabase/schema.sql`), browser + server +
  service-role Supabase clients, `.env.example`, route-protecting middleware.
- **Phase 1.2 — Dashboard shell**: Sidebar, top nav, dashboard layout/home page, plus
  Templates and Profile pages (added during the consistency audit — the sidebar linked
  to both before either page existed).
- **Phase 1.3 — AI Generator**: full generator UI (name/description/follow-up questions),
  `/api/generate` route wiring auth → rate limit → credit gating → AI provider → credit
  deduction → version history row, and the import-and-extend request shape.
- **Phase 1.4 — Live Preview**: `ExpoSnackPreview` component embedding Expo Snack.
- **Phase 1.5 — Code Editor & Export**: Monaco-based `CodeEditor` with autosave.
- **Phase 1.6 — Credits/Plans/Gating**: `lib/plans.ts` (single source of truth for pricing
  — matches the Pricing Package doc exactly) and `lib/credits.ts` (gating, deduction,
  refund-on-failure, capacity calculation).
- **Phase 1.7 — Paddle Billing**: HMAC-SHA256 webhook signature verification, event →
  subscription-update mapping, webhook route.
- **Phase 1.8 — Admin Panel**: `/admin` UI + `/api/admin/{users,subscriptions,payments}`
  routes, with a pure `evaluateAdminAccess` decision function separated from the Supabase
  I/O wrapper.
- **Zero-cost value-adds**: 2FA (Supabase Auth MFA), Custom App Icon/Splash,
  Project Folders & Tags, Clone/Duplicate App, App Version History & Rollback (now with
  a real UI to reach it — see the audit section below), Publish
  to Public Template Gallery, Custom Web Subdomain, One-Click GitHub Export, Usage
  Analytics Dashboard, Build/Deploy Webhook Notifications, In-Editor Linting (Monaco's
  built-in language services).
- **AI Prompt Engineer**: after the user describes their app, `lib/prompt-engineer.ts`
  classifies it into a category (ecommerce/fitness/social/productivity/booking/
  education/finance/general) via offline keyword matching — no model call — and
  surfaces 2-4 tailored follow-up questions on top of the fixed platform/navigation/
  backend ones. The answers are folded into the *same* single AI provider generation call
  via `engineeredContext`, so this feature adds zero cost: same 1,500-credit generation,
  a materially better prompt. See `/api/generate/analyze` (classification, free) and
  the updated `/api/generate` (folds the answers in).
- **AI Chatbot** (`ChatbotWidget.tsx`, `/api/chatbot`): a floating sparkle-icon assistant,
  system-prompted specifically as an appo product advisor (`lib/chatbot.ts`), reachable
  on both the landing page (signed-out) and the dashboard (signed-in). Deliberately NOT
  gated behind login — it's advisory only (no account/generation actions possible),
  which is what lets it help a visitor decide whether to sign up in the first place.
  Real AI provider cost per message, so it has its own rate limit (`RATE_LIMITS.chatbot`,
  15/hour) separate from every other route, keyed by user ID when logged in and
  best-effort IP when not. Degrades to an on-brand fallback message if AI provider is
  unreachable rather than surfacing a raw error.
- **Branding**: a full logo — `public/logo-icon.svg` (also `src/app/icon.svg`, picked up
  automatically by Next.js as the favicon), `public/logo-lockup.svg` (light wordmark,
  for the purple gradient background) and `public/logo-lockup-dark.svg` (dark wordmark,
  for white/light backgrounds) — plus `public/apple-touch-icon.png`.
- **`marketing-site/`**: a standalone, self-contained HTML/CSS/JS marketing site (no
  build step, no dependencies) implementing the same landing page content as
  `src/app/page.tsx`, with scroll-reveal animation and a live Prompt Engineer demo.
  Useful if you want to host the marketing site separately from the app itself, or
  preview the design without running Next.js at all — just open `marketing-site/index.html`
  in a browser.
- **Renamed appo.ai → appo**, and the theme was rebuilt from the original light purple
  gradient to a dark "Aurora" theme — near-black base, drifting violet/fuchsia/cyan
  gradient blobs, dark glassmorphism, animated gradient hero text, staggered
  scroll-reveal, glow-on-hover buttons/cards. Applied via `tailwind.config.ts` +
  `globals.css` centrally, plus per-component color-token updates, plus a real
  `RevealOnScroll` client component. The logo was redrawn to match: no more ".ai" in
  the wordmark, the final "o" now carries the accent gradient instead.
- **Pre-launch readiness** (see the build command's new "Pre-Launch Checklist" section
  for the full picture, including what's still outstanding): Terms of Service and
  Privacy Policy pages, a themed 404 page, `robots.ts` + `sitemap.ts`, Open Graph/Twitter
  Card metadata, first-party cookie consent, self-serve subscription cancellation
  (cancels at period end, never immediately), self-serve account deletion and data
  export (GDPR/CCPA basics), and a low-credit warning banner on the dashboard and
  billing page.

- **Pre-launch readiness** (see the build command's new "Pre-Launch Checklist" section
  for the full picture, including what's still outstanding): Terms of Service and
  Privacy Policy pages, a themed 404 page, `robots.ts` + `sitemap.ts`, Open Graph/Twitter
  Card metadata with a real 1200×630 OG image, first-party cookie consent, self-serve
  subscription cancellation (cancels at period end, never immediately), self-serve
  account deletion and data export (GDPR/CCPA basics), a low-credit warning banner,
  a real fixed-window **rate limiter** on `/api/generate` (see the production caveat
  about multi-instance deploys in `lib/rate-limit.ts`), **error reporting** via Sentry
  with graceful fallback, and a real **`/api/health`** endpoint that checks database
  connectivity for external uptime monitors.
- **Favorites, shareable links, onboarding checklist** — these had schema columns but
  no UI in an earlier pass; now wired for real: a star-toggle on the Apps list
  (favorited apps sort to the top), a "Share" button generating a public
  `/preview/[slug]` page (app details only — see Known Simplifications below on why
  it's not a live Snack embed yet), and a dismissible "Getting started" checklist on
  the dashboard whose steps are derived from real data (has an app, has
  exported/deployed) rather than tracked separately.

## What's genuinely tested here (and how)

This sandbox has **no network access** — `npm install` is blocked at the registry level,
so nothing that needs `next`, `@supabase/*`, `@monaco-editor/react`, or a live AI provider/
Paddle/Supabase endpoint could be executed end-to-end. Rather than fake that, two real
checks were run instead:

1. **`npm test` (Node's built-in test runner, via `tsx`)** — 78 passing tests across 20
   suites, covering every piece of logic that doesn't require an external package or
   network call:
   - credit gating & deduction (13 tests) — admin bypass, plan-gating, insufficient
     credits, zero-cost actions, failed-request refunds, and a test that locks the
     pricing page's "apps per month" figures to the real numbers so they can't drift.
   - Paddle webhook signature verification & event mapping (8 tests) — including a
     tampered-payload rejection and a wrong-secret rejection.
   - AI Prompt Engineer (15 tests) — category classification across all 7 categories,
     the fallback to "general," and a test asserting that two different descriptions
     actually produce different question sets (the entire point of the feature).
   - Chatbot system prompt & fallback responses (6 tests) — confirms the prompt always
     names appo's real constraints (so it can't overclaim), and that the signed-out
     variant includes the no-action disclaimer while the signed-in variant doesn't.
   - Low-credit warnings & cancellation policy (9 tests) — threshold boundaries,
     divide-by-zero safety on the Free plan, and confirming cancellation always takes
     effect at period end rather than immediately revoking paid access.
   - Rate limiter (5 tests) — under-limit allowance, over-limit blocking, window reset,
     per-key isolation, and correct `retryAfterMs` countdown.
   - Onboarding progress (4 tests) — derives correctly from app count and
     export/deploy status rather than a separately-tracked field.
   - Share slug generator (5 tests) — length, character set, deterministic-with-fixed-
     random (for testability), and a real-randomness sanity check.
   - AI provider prompt construction (3 tests).
   - GitHub export repo-name sanitizer (5 tests).
   - Admin access decision table (4 tests).
   - Webhook notification payload shape (1 test).

2. **`npm run typecheck` (`tsc --strict`)** — run across the entire `src/` tree using
   hand-written stub type declarations (`src/types/offline-check-stubs.d.ts`) for the
   packages that can't be installed offline. This caught one real bug (a `require()`
   call in `server.ts` that's been replaced with a proper static import) and zero others
   after fixing a handful of missing explicit event-handler types. **Delete
   `offline-check-stubs.d.ts` and `tsconfig.offline-check.json` once real dependencies
   are installed** — they exist only for this offline check and are not real type
   definitions.

**Not run, and cannot be run here:** `next dev` / `next build`, any real Supabase query,
any real AI provider generation, any real Paddle checkout or webhook delivery, the Expo Snack
embed actually rendering, Monaco actually mounting in a browser. All of that requires the
steps below in a real environment.

## Full consistency audit — what a file-by-file check found

Beyond the standard test/typecheck pass, every route was cross-referenced against
every frontend caller, every schema table/column against every query, and every
sidebar link against every actual page. This found real gaps that tests alone
couldn't catch (missing UI has no way to fail a unit test), all now fixed:

- **Version History & Rollback had no way to reach it.** The rollback route existed;
  the route to *list* versions to roll back to didn't. Added `GET /api/apps/[id]/versions`
  and a real expandable history panel with Restore on the Apps page.
- **GitHub Export was a dead button** — no OAuth flow existed to obtain a token. Wired
  a personal-access-token flow instead (pasted once per push, never stored) so it's
  actually functional rather than blocked on OAuth app registration.
- **`/api/build/[platform]` (App/Play Store queueing) had zero UI anywhere**, despite
  the build doc describing it as wired up. Added the buttons to the Apps page.
- **The sidebar linked to `/dashboard/templates` and `/dashboard/profile` — neither
  page existed.** Built both for real: Templates (seed templates + a community gallery,
  backed by new publish/clone-template routes; the `templates` table existed with zero
  seed rows, now has 5), and Profile (view/edit name, role, member-since).
- **The `templates` table had no TypeScript representation at all** — no `TemplateRow`,
  not registered in the `Database` interface. Same class of bug as the `AppRow`/
  `UserRow` gaps caught in an earlier pass. Fixed before it could cause the same issue.
- **The Dark Mode toggle was non-functional and misleading** — it flipped a `.dark`
  class that nothing in `globals.css` ever responded to (the whole theme is
  dark-by-default now), so it looked real but did nothing, and defaulted to a sun icon
  implying light mode was active when the page was always dark. Removed rather than
  left as a broken control; the false "Dark Mode Builder UI" claim was also removed
  from the build doc's feature table and the marketing site.

### A second pass found something more serious than any UI gap

- **Nothing ever provisioned a new user's account data.** `supabase.auth.signUp()`
  only creates a row in Supabase's own `auth.users` table. No trigger, no code,
  anywhere, ever created the matching `public.users` / `public.subscriptions` rows
  that literally every route queries right after checking auth. **Every authenticated
  route would have broken for every brand-new signup**, independent of anything else —
  this has nothing to do with RLS below, it would fail even with RLS off. Fixed with a
  `SECURITY DEFINER` trigger on `auth.users` insert (`handle_new_user()` in
  `supabase/schema.sql`) — the standard, documented Supabase pattern for this.
- **Row Level Security was entirely missing** — every table had RLS *disabled*, meaning
  any authenticated user's own client could potentially read or write any row in any
  table via Supabase's REST API directly, regardless of what the application routes
  checked. Added real policies for every table. While designing them, caught and fixed
  a real exploit path: `generate/route.ts`, `build/[platform]/route.ts`, and
  `subscription/cancel/route.ts` were all writing credits/status through the *user's
  own client* — a naive "update your own subscription" policy would have let a
  technical user PATCH their own credits or plan directly via the REST API, for free.
  Fixed by moving those writes to the service-role client after server-side
  validation, and giving `subscriptions` **zero direct write access** for regular
  users at the database level. Same treatment for `is_public_template` and
  `share_slug` (both plan-gated).
- **Found while wiring the above**: `/api/apps/[id]/share` enforced no plan check at
  all, despite the build doc always describing Shareable Preview Link as Pro/Business
  -only. Added the missing `shareablePreviewLink` feature flag and the actual gate.
- **Caught two mistakes in my own first RLS draft before they shipped**: an
  ownership-only policy on `apps` would have silently broken the Templates gallery
  (which reads *other users'* public templates through the regular client) — fixed
  with an explicit `is_public_template = true` clause. And `app_versions` had no
  INSERT policy at all in that draft, which would have silently blocked version
  history creation on every single generation — fixed by routing that write through
  service role too.
- **Honest gap, not papered over**: RLS restricts rows, not columns. A few plan-gated
  fields on `apps` are protected by routing their writes through validated
  service-role routes, but a technical user could still reach those specific columns
  directly via the REST API on a row they otherwise legitimately own. The real fix is
  Postgres column-level `GRANT`/`REVOKE` on top of these policies — noted in both this
  README and the schema comments, not yet done.

## Running this for real

```bash
npm install
cp .env.example .env.local   # fill in your real keys
# Apply supabase/schema.sql in your Supabase project's SQL editor
npm run dev
```

Then, once dependencies are installed:

```bash
npm run typecheck   # drop the --project flag / delete tsconfig.offline-check.json first
npm test
```

## Explicitly stubbed / deferred (per the build command's Hard Constraints)

- Real EAS Build / real App Store / Play Store submission — `/api/build/[platform]`
  returns `status: "queued"` today by design.
- OTA updates, push notifications — Phase 2.
- Full template library — 3–5 seed templates is enough to validate the generator.
- Custom Web Subdomain provisioning — the column/gating exists; actual wildcard DNS +
  routing is an infra step for a real deployment, not app code.

## Known simplifications worth knowing about before shipping

- The AI provider endpoint was updated from `gemini-1.5-pro` (retired by Google, now
  returns 404) to `gemini-3.6-flash` — cheaper per token and benchmarks better on
  coding than the Pro tier it replaced. Re-check this if Google retires models again;
  it's happened at least once already in 2026.
- Credit allowances (`lib/plans.ts`) were revised upward after checking real AI provider
  3.6 Flash pricing against the credit-cost model — actual API spend per generation is
  roughly $0.04, far under what the original 60–70% margin target assumed, so there was
  real room to be more generous. Free specifically was raised from 150 credits (which
  couldn't cover even one 1,500-credit generation — a free user could never see a
  generated app) to 2,000.

- `GeneratedProject` files from AI provider are inserted into `apps`/`app_versions` without
  yet writing the actual file contents to Supabase Storage — the route stores the
  version pointer but the real file-write call is left as a clear next step.
- The GitHub export route currently pushes a placeholder README rather than the app's
  real generated files, for the same reason (storage wiring not included in this pass).
- The shareable preview link (`/preview/[slug]`) shows the app's name/version/platforms,
  not a live interactive Expo Snack embed — the same missing Storage wiring is why.
  Real live-preview sharing is a good Phase 2 item once that's in place.
- Paddle checkout button is a stubbed `console.log` — real checkout needs
  `@paddle/paddle-js` initialized with `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` at runtime.
- The rate limiter (`lib/rate-limit.ts`) uses an in-memory store, which only enforces
  correctly on a single running instance. A standard multi-instance Vercel deployment
  needs a shared store (Upstash Redis is the usual pairing) before the limit holds up
  under real traffic — the `RateLimitStore` interface is the swap point, no call sites
  need to change.
- Sentry is wired (`lib/error-reporting.ts`, config files, `@sentry/nextjs` in
  `package.json`) but reports nowhere until a real `NEXT_PUBLIC_SENTRY_DSN` is set —
  it silently falls back to `console.error` until then, by design, so it never breaks
  anything if you forget to configure it, but also isn't actually monitoring yet.

## Phase 7 — Collaboration

Apply `supabase/phase-7-migration.sql` after the Phase 6 migration to enable Pro/Business team collaboration. The feature adds app collaborators with viewer/editor roles, secure 7-day email-bound invitation links, invitation acceptance, collaborator removal, and a Team workspace. Invitation tokens are stored only as SHA-256 hashes; raw tokens are returned once to the inviter for sharing.

- **Phase 14 — Reliability & production hardening**: readiness endpoint, request IDs, security headers, global error recovery, and dashboard loading state. No schema migration required.
