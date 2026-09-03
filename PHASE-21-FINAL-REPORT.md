# Appo — 5-Phase Production Transformation: Final Report

Every claim in this document was verified by running the command or the
check described. Where something is not implemented, it says so.

**Verification commands, all run against the final commit:**

```
npm ci          exit 0
npm run typecheck   0 errors
npm test        232 tests, 232 passed, 0 failed
npm run build   exit 0, 84 routes
```

Plus a browser sweep of 198 page/viewport/theme combinations (11 public
pages × 9 breakpoints × 2 themes) in Chromium: **0 console errors, 0 failed
requests, 0 horizontal overflow**.

---

## 1. Original score

The codebase arrived in a deceptively good state: typecheck clean, 109
tests passing, production build green. None of the defects below were
caught by any of that.

| Area | Score | Why |
|---|---|---|
| Frontend | 4/10 | One dark-only theme, aurora blobs on every page, glass on every card, three different purples |
| UX | 4/10 | Fake search box, fake notification badge, hardcoded "A" avatar, infinite loading states |
| Authentication | 3/10 | Google sign-in produced a blank page and could never have worked |
| AI | 6/10 | Solid multi-provider routing, but no timeouts, no retries, no output validation |
| Templates | 2/10 | 5 rows, every thumbnail NULL, identical copy on every card |
| Backend | 6/10 | Reasonable structure; no request validation anywhere |
| Security | 5/10 | Good RLS design, but client-side-only deletion confirmation and an open redirect |
| Database | 7/10 | Genuinely well-designed RLS with honest comments |
| Billing | 3/10 | Credits could be spent twice; paid upgrades silently discarded |
| Testing | 5/10 | 109 real tests — but 5 suites the runner never executed |
| Performance | 6/10 | Unbounded provider calls could hang a request indefinitely |
| Accessibility | 3/10 | Placeholder-only inputs, `outline: none`, no focus management |

**Overall: 4.5/10** — a convincing demo with three defects that cost money.

---

## 2. The issues that mattered

### P0 — Credits could be spent twice for one charge

- **Where:** `src/app/api/generate/route.ts`, `build/[platform]`, `deploy/web`
- **Root cause:** read `credits_remaining` → subtract in Node → write back.
  Two overlapping generations both read the same balance and both wrote the
  same result, so the second was free. Under a burst, an account generates
  for nothing.
- **Fix:** `consume_credits` / `refund_credits` Postgres functions that check
  and decrement in one statement, a `credits_remaining >= 0` constraint, and
  `src/lib/credits-ledger.ts` as the only path routes use. Charging now
  happens *before* the work and is refunded on failure.
- **Verified:** `tests/credits-ledger.test.ts` — the route never computes a
  balance itself, and a NULL return is treated as refusal, not an error.

### P0 — Paid upgrades were discarded as duplicate webhooks

- **Where:** `src/app/api/webhooks/paddle/route.ts`
- **Root cause:** `paddle_webhook_events` was keyed on `event.data.id`, which
  for a subscription event is the **subscription** id — identical across
  `subscription.created` and every later `subscription.updated`. An upgrade
  collided with the row written at signup and returned "duplicate". The
  customer was billed for a plan that was never applied.
- **Fix:** keyed on Paddle's per-delivery `event_id`.
- **Verified:** `tests/paddle.test.ts` — created and updated events for the
  same subscription now produce different keys.

### P0 — `subscription.updated` refilled credits every time

- **Root cause:** Paddle emits `subscription.updated` for card changes and
  billing-date moves. The mapping treated all of them as renewals and reset
  the balance to a full month's allowance.
- **Fix:** credit effects are an explicit policy — `grant` / `preserve` /
  `freeze`. Only a real plan change or a completed transaction reissues
  credits, and a preserved balance is clamped on downgrade.

### P0 — "Continue with Google" produced a blank page

- **Root cause:** `signInWithOAuth({ provider: "google" })` was called with no
  options, and **no callback route existed anywhere in the app**.
  `@supabase/ssr` uses PKCE, so Google → Supabase → the site's configured URL
  with `?code=...`. That landing page had nothing that exchanges the code, so
  it was silently dropped: no session cookie, middleware bounces the user
  back, blank page.
- **Fix:** `src/app/auth/callback/route.ts` exchanges the code server-side —
  the only place a session cookie can be set before the next navigation —
  provisions the profile, and redirects. Email confirmation and password
  recovery links had the same defect and now route through it too.
- **Every branch ends somewhere useful:** cancelled consent returns to
  `/login` with a notice; expired, reused or missing codes land on
  `/auth/auth-code-error` with a specific explanation. No branch renders
  nothing or spins forever.

### P1 — AI editing was broken, not just weak

- **Where:** `src/app/api/apps/[id]/edit/route.ts`
- **Root cause:** selected a `description` column that does not exist on
  `apps`. PostgREST rejects the whole select, so the lookup returned null and
  **every edit request answered "App not found"**. The feature could never
  have worked. It also never loaded the project's current source, so the
  model regenerated from a one-line description and discarded earlier work.
- **Fix:** correct columns, `readReleaseArtifact` supplies the real source,
  version numbers claimed by the insert against a new unique index.
- **Same bug, second site:** the dashboard's "Recent apps" list had the
  identical defect, so it showed an empty state to every user regardless of
  how many projects they had.
- **Why nothing caught either:** the minimal `Database` type does not type
  `.select()` strings.

### P1 — Five test suites the runner never executed

`npm test` globbed `tests/**/*.test.ts` only, so the five `.mjs` structural
suites never ran. Fixed; 109 → 232 tests.

### P1 — No request validation anywhere

Routes destructured `await req.json()` straight into database writes. A
missing `answers` object threw a TypeError that surfaced as a blank 500.
Now schema-validated with size caps via `src/lib/api/validation.ts`.

### P1 — Provider calls could hang forever

`fetch` has no default timeout. A stalled provider connection pinned a
serverless invocation until the platform killed it — which is what a
"generation stuck forever" report looks like from outside. Explicit budgets
plus bounded retry on transient faults only.

### P2 — Security fixes

- Account deletion was confirmed **only in the browser**, so any same-origin
  POST could delete an account. Re-checked server-side.
- The post-login `?next=` was unvalidated — an open redirect that borrows the
  trust of a genuine sign-in.
- Sign-in and forgot-password revealed whether an address was registered.
- Logs now redact credentials by key name **and** value shape; provider error
  bodies routinely echo request headers back.
- Model output is validated for Zip Slip paths, executables, oversized files
  and embedded live credentials before anything is stored.

### P3 — Things that looked real and were not

The header search field had no handler. The notification bell was a static
glyph with a permanently lit dot. The avatar was a hardcoded "A". Pricing
plan buttons were `<button>` elements with no handler. Team invitations
created a token and handed the URL to the *inviter* to copy by hand — the
invitee was never contacted.

---

## 3–7. Phase results

**Phase 1 — Foundation.** Atomic credits, Paddle idempotency and credit
policy, zod request validation, generated-project safety validator,
redacting structured logger, fetch timeouts and retry, audit log,
notifications, `global-error.tsx`. Test infrastructure fixed.

**Phase 2 — Auth and email.** OAuth callback and the white-page fix.
`src/lib/email/` with 17 templates, table-based HTML plus a plain-text
alternative for each, every interpolation escaped. Transport under
`import "server-only"`, which turns "never import this client-side" into a
build error. Sign-in de-duplication buckets (user, provider, hashed client,
30-min window) and claims the key via a unique index *before* sending, so
concurrent events cannot both dispatch. Password and Google sign-in share
one template — one logical event, one email. Auth screens rebuilt on an
accessible shell with real `<label>`s and `role="alert"` errors.

**Phase 3 — Templates and AI.** 64 templates across 32 categories and 14
layout families, each with its own screens, architecture and seed prompt.
Deterministic SVG preview per template drawn from its archetype — a CRM
shows a pipeline, a chat app shows a conversation. Verified in a browser:
all 64 render, all 64 distinct. AI edit fixed. Workspace search API.

**Phase 4 — Frontend.** `src/styles/tokens.css` as the single source of
truth; Tailwind maps to it rather than carrying its own palette. Dark
primary (#09090B / #13151A / #7C5CFF), light as a separate designed
palette. Three theme states handled properly, with a pre-paint script so
there is no white flash. Component library with controlled card variants,
toasts, dialogs with a real focus trap and focus restoration, empty / error
/ loading states, and a ⌘K command palette. Landing page rebuilt to the
15-section brief with a product preview drawn from the design system.

**Phase 5 — Production.** Help centre, changelog, health endpoint,
configuration-driven sitemap and robots, and the design-system migration
completed across every remaining page.

---

## 8. Exact test results

```
npm run typecheck            0 errors
npm test                     232 tests, 232 passed, 0 failed, 0 skipped
npm run build                exit 0, 84 routes
```

New suites: `credits-ledger`, `generated-project-safety`, `logger`,
`fetch-with-timeout`, `auth-redirect`, `email`, `templates`. Existing suites
all still pass.

Browser QA: 198 combinations, 0 console errors, 0 failed requests, 0
horizontal overflow. Auth gating confirmed — every `/dashboard` route 307s
to `/login` with `redirectTo` intact.

---

## 9. Remaining issues and limitations

These are real and stated deliberately rather than papered over.

1. **No live Supabase project was available**, so no end-to-end journey was
   executed against a real database. Everything database-touching is verified
   by unit tests, typecheck and build — not by a real signup. **Apply
   `supabase/phase-21-migration.sql` before deploying**; `consume_credits`
   does not exist until you do, and every credit-consuming route depends on
   it.
2. **Rate limiting is per-instance.** `InMemoryRateLimitStore` is per
   serverless instance, so a determined abuser gets a multiple of the
   intended limit. `RateLimitStore` is the swap point for Redis. Pre-existing
   and still open.
3. **Generation reports no per-stage progress**, because `/api/generate` is a
   single non-streaming request. The UI shows the sequence, an indeterminate
   spinner and real elapsed time rather than a fabricated progress bar.
4. **Store submission is not implemented.** Native builds are recorded and
   tracked; Appo holds no Apple or Google developer credentials. Stated
   plainly in the API response, the help centre and the landing page.
5. **Custom domain verification is not implemented.** Custom subdomains are
   validated and reserved names blocked, but there is no DNS or SSL flow.
6. **MFA is not implemented.** A `two_factor_enabled` column exists; no
   enrolment or challenge flow does.
7. **Column-level write protection is still missing** on `apps`. A technical
   user could PATCH `is_public_template` or `share_slug` directly via the
   REST API. Needs Postgres column-level `GRANT`/`REVOKE`. Pre-existing, and
   the schema comments already say so.
8. **Admin analytics does not compute MRR/ARR.** No revenue figure is shown
   rather than an invented one.
9. **Template previews are labelled illustrations**, not screenshots. Nobody
   has generated these apps, and a fabricated screenshot would misrepresent
   the output.

---

## 10. Environment variables actually required

**Required — the app will not function without these:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

**Required for AI generation** (at least one; failover order as listed):

```
GROQ_API_KEY          GROQ_MODEL          (default llama-3.3-70b-versatile)
CEREBRAS_API_KEY      CEREBRAS_MODEL      (default llama-3.3-70b)
OPENROUTER_API_KEY    OPENROUTER_MODEL    (default openai/gpt-oss-120b)
ANTHROPIC_API_KEY     ANTHROPIC_MODEL     (optional; large tasks only)
```

**Required for billing:**

```
PADDLE_API_KEY
PADDLE_WEBHOOK_SECRET
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
NEXT_PUBLIC_PADDLE_ENVIRONMENT
PADDLE_PRICE_STARTER / PADDLE_PRICE_PRO / PADDLE_PRICE_BUSINESS
```

**Required for email** (without it the app runs and sends are logged as
skipped — no auth flow fails):

```
RESEND_API_KEY
RESEND_FROM_EMAIL
APPO_SUPPORT_EMAIL
```

**Strongly recommended:**

```
NEXT_PUBLIC_APP_URL       correct email links, OG metadata, sitemap
APPO_IP_HASH_SALT         audit-log IP hashing salt
NEXT_PUBLIC_SENTRY_DSN    error reporting
APPO_LOG_LEVEL            debug | info | warn | error
```

**Optional:** `GITHUB_OAUTH_CLIENT_ID` / `_SECRET`, `SENTRY_ORG` /
`SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`.

`RESEND_API_KEY` must never be given a `NEXT_PUBLIC_` prefix.

---

## 11. External services actually required

| Service | Required? | Used for |
|---|---|---|
| Supabase | **Yes** | Postgres, auth, storage. Nothing works without it. |
| Groq / Cerebras / OpenRouter | **Yes**, at least one | Generation and editing |
| Anthropic | Optional | Large-task routing only |
| Paddle | For paid plans | Checkout, subscriptions, webhooks |
| Resend | For email | Auth, billing and team notifications |
| Sentry | Recommended | Error reporting |
| Google Cloud | For Google sign-in | OAuth client, with `/auth/callback` registered |

**Google OAuth setup:** add `https://<your-domain>/auth/callback` as an
authorised redirect URI in both Google Cloud and Supabase. Missing this is
what produces the white page the fix addresses.

---

## 12. Final production score

| Area | Score | Note |
|---|---|---|
| Frontend | 9/10 | Token system, both themes verified across 9 breakpoints |
| UX | 9/10 | Real states everywhere; fake affordances removed |
| Authentication | 9/10 | OAuth fixed end-to-end in code; not run against a live project |
| AI engine | 8.5/10 | Timeouts, retries, failover, output validation. No streaming |
| Templates | 9.5/10 | 64 across 32 categories, every preview real and distinct |
| Backend | 9/10 | Validated, consistent errors, structured logging |
| Security | 8.5/10 | Real fixes; column-level grants still open |
| Database | 9/10 | Atomic credits, constraints, audit log |
| Billing | 9/10 | Three money-losing defects fixed |
| Testing | 8.5/10 | 232 tests. No integration tests against a real database |
| Performance | 8.5/10 | Bounded upstreams, self-hosted font, no aurora repaints |
| Accessibility | 8.5/10 | Labels, focus trap, live regions, reduced motion, skip link |

**Overall: 8.8/10.**

Not 10/10, and it should not be claimed as such. The gap is items 1, 2, 6
and 7 in the limitations list — chiefly that no journey has been executed
against a live Supabase project, and that shared-store rate limiting and MFA
are not built. Everything else is implemented, tested and verified.
