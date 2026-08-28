> **Figma implementation requirement:** Treat the supplied Figma template and screenshots as the primary visual source of truth for Appo's frontend. Do not create a generic SaaS dashboard "inspired by" the reference. First inspect every available Figma screen and screenshot and identify its layout, spacing, typography, colors, navigation, cards, buttons, icons, imagery, borders, shadows, responsive behavior, animations, transitions and component hierarchy. Then reproduce those visual patterns as closely as technically and legally appropriate inside Appo. Keep Appo's functionality and information architecture, but map each Figma visual pattern to the corresponding Appo feature. Do not use music-player content or branding. The finished Appo frontend should feel like the same design family and experience as the supplied Figma template, not merely a similar-looking SaaS application.

---

## ADDENDUM — FIGMA → APPO SCREEN MAPPING

**What's actually available to inspect right now:** one Figma Community cover/collage image (the "Melodies" listing page — logo, tagline, and a stacked preview of several screens at thumbnail size) plus the Figma URL itself. This is enough to extract the reference's *visual system* (palette, typography weight, card and pill treatment, dark-surface + gradient-accent language) but not pixel-accurate spacing or exact component structure for each individual screen — that requires the owner to export/upload each screen separately (home, library/discover, artist/detail, player/workspace, mobile) at full resolution. Until those are supplied, per-screen instructions below describe the *pattern* to reproduce, not an exact spec Claude has inspected first-hand. Do not claim pixel-perfect fidelity to a screen that hasn't actually been inspected.

**Screen/pattern → Appo feature mapping:**

| Figma (Melodies) | Appo |
|---|---|
| Navigation sidebar | Appo dashboard sidebar |
| Home | Appo dashboard overview |
| Library / collections | Appo "My apps" |
| Discover | Appo templates/marketplace |
| Artist/album detail page | Appo project overview (`apps/[id]`) |
| Player / main workspace | Appo AI Builder (`dashboard/generator`) |
| Player transport controls | Appo Preview / Edit / Verify / Release actions |
| Trending/weekly-top song grid & table | Appo recent apps grid / activity table |
| Mobile nav | Appo mobile sidebar drawer |

Once full-resolution per-screen exports are supplied, extend this table with exact structural notes per screen (e.g. "Screen 2 → this sidebar/header/card arrangement") rather than general pattern language.

---

# APPO — CLAUDE MASTER IMPLEMENTATION PROMPT
## Complete SaaS Transformation + Figma-Inspired Front-End Redesign

**Purpose:** Give this entire document to Claude together with the existing Appo ZIP repository. Claude must use it as the implementation contract and make the changes directly in the repository.

**Source repository:** `Appo-Groq-Cerebras-OpenRouter-Claude.zip`

**Existing product specification supplied by the owner:** `Appo-Complete-SaaS-Product-Specification.md`

**Figma reference supplied by the owner:** 
urlFigma — Music Player Website App / MelodiesFirsthttps://www.figma.com/community/file/1343187520238140442/music-player-website-app-melodiesfirst

> IMPORTANT: The Figma URL is a visual reference. Do not turn Appo into a music-player product. Recreate the **visual language, layout quality, spacing, typography, card treatment, navigation feel, visual hierarchy, interactions, motion and polish** of the reference while keeping Appo's AI app-builder SaaS functionality.
>
> The screenshots mentioned by the owner are part of the requested visual reference. If they are available to you in the working environment, inspect them. If they are not available, inspect the Figma URL if your environment can access it and otherwise use the visual requirements in this document. Do not invent exact Figma measurements that you cannot inspect.

---

# 1. NON-NEGOTIABLE INSTRUCTIONS TO CLAUDE

1. First inspect the **entire repository** before changing code.
2. Do not blindly rewrite the project.
3. Preserve working functionality and existing user/project data.
4. Preserve useful existing components, APIs, database models and tests where they are sound.
5. Make the smallest safe changes needed to reach the target.
6. Do not create fake buttons, fake analytics, fake billing, fake deployments, fake AI responses or fake success states.
7. Every visible action must either work end-to-end or be clearly disabled with a truthful explanation.
8. Never expose API keys, Supabase service-role keys, Paddle secrets, webhook secrets or other private credentials to the browser.
9. All authentication and authorization decisions must be enforced server-side.
10. Validate all user-controlled input on the server.
11. Treat generated and imported source code as untrusted.
12. Never execute arbitrary generated/imported code inside the main Appo Next.js server.
13. Preserve database compatibility and never silently destroy data.
14. Do not add dependencies unless they are genuinely required.
15. Keep provider-specific AI logic behind an abstraction.
16. Do not make Gemini mandatory.
17. Do not make Anthropic Claude mandatory.
18. The requested AI fallback order is:
    - Groq
    - Cerebras
    - OpenRouter
    - Anthropic Claude only for complex/large work when configured
19. Do not fail over for permanent user/configuration errors.
20. Fail over for 429/quota/rate-limit, timeout, transient provider/network failure and temporary provider capacity failures.
21. Never log secrets or raw authentication/payment credentials.
22. Do not claim a test passed unless it actually ran.
23. Do not claim the production build passed unless it actually ran in a real dependency-complete environment.
24. Deployment may remain disabled/unconfigured until the owner supplies deployment infrastructure. Do not fake deployment.
25. The final application must feel like **one coherent premium SaaS product**, not a collection of disconnected pages.
26. Keep Appo's product identity: **AI app builder / application generator SaaS**.
27. The Figma reference changes the **presentation and UX**, not the product category.
28. Avoid excessive visual effects that reduce readability or performance.
29. Respect reduced-motion preferences.
30. Use accessible semantic HTML and keyboard navigation.
31. Keep mobile, tablet, laptop, desktop and large desktop layouts usable.
32. At every phase, update the implementation carefully and run the checks that are actually possible.
33. If a required external service is not configured, implement the integration correctly but provide a truthful configuration state rather than pretending it is live.
34. Never remove a feature merely because the current UI is being redesigned.
35. Before finishing, perform a route-by-route, feature-by-feature and API-by-API audit.

---

# 2. WHAT IS ALREADY IN THE REPOSITORY — DO NOT DUPLICATE IT BLINDLY

The supplied ZIP contains approximately **258 repository entries** and already includes substantial functionality.

Important existing areas include:

- Next.js application
- Supabase authentication/database/storage integration
- AI generation route
- AI provider router
- Groq/Cerebras/OpenRouter support
- optional Anthropic support
- AI prompt engineering
- AI chatbot
- project creation
- app editing
- project versions
- rollback
- releases
- release artifacts
- preview
- verification
- import
- GitHub export
- deployment APIs
- Paddle billing
- credits/usage
- analytics
- activity
- team/collaboration
- templates/marketplace
- profile/settings
- admin pages
- account export/deletion
- Sentry integration
- rate limiting
- tests
- Supabase migrations/schema

Existing important paths include:

### Application routes
- src/app/(auth)/login/page.tsx
- src/app/(auth)/signup/page.tsx
- src/app/(auth)/forgot-password/page.tsx
- src/app/admin/page.tsx
- src/app/privacy/page.tsx
- src/app/dashboard/settings/page.tsx
- src/app/dashboard/deployments/page.tsx
- src/app/dashboard/generator/page.tsx
- src/app/dashboard/get-started/page.tsx
- src/app/dashboard/profile/page.tsx
- src/app/dashboard/apps/page.tsx
- src/app/dashboard/apps/[id]/page.tsx
- src/app/dashboard/page.tsx
- src/app/dashboard/activity/page.tsx
- src/app/dashboard/billing/page.tsx
- src/app/dashboard/analytics/page.tsx
- src/app/dashboard/team/page.tsx
- src/app/dashboard/templates/page.tsx
- src/app/page.tsx
- src/app/preview/[slug]/page.tsx
- src/app/terms/page.tsx

### API routes
- src/app/api/build/[platform]/route.ts
- src/app/api/deployments/route.ts
- src/app/api/deployments/[id]/rollback/route.ts
- src/app/api/account/export/route.ts
- src/app/api/account/profile/route.ts
- src/app/api/account/onboarding-complete/route.ts
- src/app/api/account/delete/route.ts
- src/app/api/admin/payments/route.ts
- src/app/api/admin/subscriptions/route.ts
- src/app/api/admin/users/route.ts
- src/app/api/readiness/route.ts
- src/app/api/chatbot/route.ts
- src/app/api/invitations/accept/route.ts
- src/app/api/import/route.ts
- src/app/api/health/route.ts
- src/app/api/apps/route.ts
- src/app/api/apps/[id]/favorite/route.ts
- src/app/api/apps/[id]/versions/route.ts
- src/app/api/apps/[id]/edit/route.ts
- src/app/api/apps/[id]/collaborators/[collaboratorId]/route.ts
- src/app/api/apps/[id]/collaborators/route.ts
- src/app/api/apps/[id]/releases/[version]/download/route.ts
- src/app/api/apps/[id]/publish-template/route.ts
- src/app/api/apps/[id]/github-export/route.ts
- src/app/api/apps/[id]/route.ts
- src/app/api/apps/[id]/clone-template/route.ts
- src/app/api/apps/[id]/rollback/route.ts
- src/app/api/apps/[id]/share/route.ts
- src/app/api/apps/[id]/clone/route.ts
- src/app/api/webhooks/paddle/route.ts
- src/app/api/subscription/cancel/route.ts
- src/app/api/subscription/route.ts
- src/app/api/deploy/web/route.ts
- src/app/api/activity/route.ts
- src/app/api/generate/analyze/route.ts
- src/app/api/generate/route.ts
- src/app/api/verify/route.ts
- src/app/api/billing/config/route.ts
- src/app/api/analytics/route.ts
- src/app/api/team/apps/route.ts
- src/app/api/templates/route.ts

### Reusable components
- src/components/CodeEditor.tsx
- src/components/Sidebar.tsx
- src/components/ChatbotWidget.tsx
- src/components/CookieConsent.tsx
- src/components/PricingTable.tsx
- src/components/ExpoSnackPreview.tsx
- src/components/RevealOnScroll.tsx
- src/components/OnboardingChecklist.tsx
- src/components/TopNav.tsx

### Tests
- tests/phase19.test.mjs
- tests/activity.test.ts
- tests/rate-limit.test.ts
- tests/ai-router.test.ts
- tests/chatbot.test.ts
- tests/project-verifier.test.ts
- tests/phase15.test.ts
- tests/analytics.test.ts
- tests/account-lifecycle.test.ts
- tests/github-export.test.ts
- tests/onboarding.test.ts
- tests/share-slug.test.ts
- tests/collaboration.test.ts
- tests/credits.test.ts
- tests/billing.test.ts
- tests/admin-access.test.ts
- tests/gemini.test.ts
- tests/phase18.test.mjs
- tests/deployment-release.test.ts
- tests/phase14.test.ts
- tests/prompt-engineer.test.ts
- tests/phase16.test.mjs
- tests/paddle.test.ts
- tests/webhook-notify.test.ts
- tests/phase12.test.ts
- tests/phase16.test.ts
- tests/phase20.test.mjs
- tests/phase17.test.mjs
- tests/deployment.test.ts

The repository's README states that the project already has substantial functionality including generation, preview, code editing, credits, Paddle billing, admin, versioning, rollback, template publishing, custom subdomains, GitHub export, analytics, chatbot, branding, account lifecycle and other pre-launch features.

**Your job is therefore primarily an upgrade, hardening, integration and professional redesign — not a destructive rewrite.**

---

# 3. CURRENT IMPLEMENTATION AUDIT — IMPORTANT VISUAL GAP

The existing repository currently uses a **dark Aurora/glassmorphism visual direction** with violet/fuchsia/cyan accents.

The existing design system contains tokens such as:

- near-black surfaces
- violet `#8B5CF6`
- fuchsia `#D946EF`
- cyan `#22D3EE`
- dark glass cards
- gradient backgrounds
- glowing hover effects

The current sidebar is a fixed dark workspace navigation with:

- Overview
- Get started
- My apps
- AI Builder
- Templates
- Deployments
- Analytics
- Activity
- Team
- Billing
- Profile
- Settings

The current top navigation contains:

- page title
- subtitle
- search
- New app
- activity
- profile

The current AI Builder already has:

- project/name/description input
- AI analysis
- smart follow-up questions
- platform selection
- navigation choice
- backend choice
- authentication/database/storage choices
- AI generation
- preview/code tabs
- verification

**Do not delete these capabilities. Redesign and improve them.**

The primary visual task is to transform the current dark developer-dashboard appearance into a **premium, light, elegant, editorial/product-design-oriented SaaS experience inspired by the supplied MelodiesFirst Figma reference**.

---

# 4. TARGET PRODUCT POSITIONING

Appo should communicate immediately:

> **Describe your app. Appo plans, builds, verifies and helps you ship it.**

Target customers:

- founders
- startups
- developers
- designers
- agencies
- product teams
- students
- businesses

Primary journey:

**Landing → Sign up → Onboarding → Dashboard → Create App → Describe App → AI Plan → Generate → Preview → AI Edit → Review Diff → Verify → Version → Release → Deploy → Continue Iterating**

Secondary journeys:

- Import existing app
- Import GitHub repository
- Start from template
- Clone project
- Collaborate with team
- Monitor usage
- Manage billing
- Review activity
- Export project
- Roll back version
- Publish template

---

# 5. VISUAL DIRECTION — FIGMA-INSPIRED, NOT A COPY OF THE PRODUCT

## 5.1 Overall feeling

The front end should feel:

- light
- premium
- calm
- modern
- refined
- editorial
- polished
- spacious
- high-end
- creative
- approachable
- product-led
- technically credible

Use the supplied Figma reference for visual inspiration.

The application should look like it was designed by a professional product-design team rather than assembled from generic dashboard components.

## 5.2 Light-first color system

Replace the current dark-first Aurora presentation with a light-first system.

Suggested semantic palette:

- page background: warm/off-white
- primary surface: white
- secondary surface: soft neutral
- primary text: near-black
- secondary text: muted gray
- tertiary text: lighter gray
- border: subtle warm gray
- accent: refined violet/indigo
- secondary accent: soft pink/fuchsia only where useful
- success: restrained green
- warning: amber
- error: red
- info: blue

Do not use dozens of unrelated colors.

Do not use loud neon gradients throughout the product.

Gradients can be used selectively for hero artwork, highlighted CTA elements or subtle decorative effects.

## 5.3 Typography

Create a consistent type hierarchy:

- display hero
- page title
- section heading
- card heading
- body
- secondary text
- metadata
- labels
- captions

Prioritize:

- excellent line-height
- readable paragraph width
- clear font weights
- consistent letter spacing
- responsive type scaling

Use one primary UI font and, only if visually justified, one display treatment.

## 5.4 Layout

Use generous whitespace.

Use a strong grid.

Avoid cramped cards.

Avoid excessive rounded rectangles everywhere.

Use a consistent radius system:

- small controls
- medium controls/cards
- large feature panels
- extra-large hero sections where appropriate

Borders should be subtle.

Shadows should be soft and restrained.

## 5.5 Motion

Add polished motion:

- page fade/slide entrance
- card hover lift
- button press feedback
- tab transitions
- modal/drawer transitions
- sidebar transitions
- builder progress transitions
- skeleton shimmer
- AI generation progress
- preview loading
- success confirmation
- toast entrance/exit

Motion must be fast and purposeful.

Respect:

`prefers-reduced-motion`.

---

# 6. GLOBAL DESIGN SYSTEM IMPLEMENTATION

Create a centralized design token system rather than scattering visual values across pages.

Centralize:

- colors
- typography
- spacing
- radius
- borders
- shadows
- focus states
- animation timing
- z-index
- breakpoints
- component states

Create/reuse a consistent component library:

- Button
- IconButton
- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch
- Badge
- Avatar
- Tooltip
- Dropdown
- Popover
- Dialog
- Drawer
- Tabs
- Accordion
- Card
- FeatureCard
- StatCard
- EmptyState
- ErrorState
- LoadingState
- Skeleton
- Toast
- Alert
- Progress
- Breadcrumbs
- Pagination
- DataTable
- SearchInput
- CommandMenu

Do not introduce a component solely for visual decoration if an existing component can be extended.

---

# 7. PUBLIC LANDING PAGE — COMPLETE REDESIGN

The landing page must be the strongest marketing page.

## Hero

Create:

- premium navigation
- Appo logo
- product links
- pricing
- templates/marketplace
- documentation/help
- sign in
- primary CTA
- secondary CTA

Hero:

- strong headline
- concise explanation
- primary "Start Building" CTA
- secondary "Explore Templates" CTA
- visual interactive builder preview

Recommended message:

**Describe your app. Appo builds the project.**

Supporting message:

Turn an idea into a structured application with AI planning, generation, preview, editing, verification, versions and release workflows.

## Hero visual

Create a sophisticated product mockup:

- browser/app frame
- left project context
- central AI conversation
- right preview
- progress indicators
- file changes
- verification state

The visual should feel real and product-specific.

Do not fabricate real user metrics.

## Sections

1. Hero
2. How Appo works
3. AI planning
4. Project generation
5. Live preview
6. AI editing
7. Verification
8. Templates/marketplace
9. Import existing apps
10. Collaboration
11. Releases/deployment
12. Security/trust
13. Pricing
14. FAQ
15. Final CTA
16. Footer

## Social proof

Only show:

- real logos
- real testimonials
- real usage numbers

if the repository/data actually contains them.

Otherwise omit or use capability statements.

Never fabricate customers.

---

# 8. PUBLIC PRICING PAGE

Make pricing feel premium and understandable.

Plans:

- Free
- Starter
- Pro
- Business

Use the existing `src/lib/plans.ts` as the source of truth.

Do not hardcode conflicting numbers into UI.

Show:

- price
- monthly credits
- estimated capacity where appropriate
- feature list
- current plan
- upgrade
- downgrade
- billing state
- usage

Paddle remains the payment provider.

If Paddle is not configured, show a truthful configuration/unavailable state.

---

# 9. AUTHENTICATION UX

Pages:

- Sign in
- Sign up
- Forgot password
- Reset password
- Verify email
- Callback
- Recovery

Visual style:

- clean centered auth layout
- soft background
- product illustration/preview
- elegant form
- strong hierarchy
- inline validation
- password visibility
- loading state
- disabled state
- error state
- success state

Security:

- Supabase Auth
- protected routes
- server-side authorization
- rate limiting where appropriate

---

# 10. ONBOARDING

Create a polished multi-step onboarding experience.

Step 1:
- name

Step 2:
- role/use case

Step 3:
- what they want to build

Step 4:
- experience level

Step 5:
- team size if useful

Step 6:
- category

Finish:

**Create your first app**

Starter ideas:

- SaaS dashboard
- ecommerce
- booking
- CRM
- task manager
- AI chatbot
- portfolio
- internal tool

The onboarding should feel quick, visual and low-friction.

---

# 11. AUTHENTICATED APP SHELL — FIGMA-INSPIRED REDESIGN

The existing dashboard shell must be redesigned.

## Desktop

Use:

- refined left navigation
- top contextual header
- spacious content canvas
- optional secondary project navigation

Do not make the sidebar visually heavy.

Sidebar should contain:

### Workspace
- Overview
- Get started
- My apps
- AI Builder
- Templates
- Deployments
- Analytics
- Activity
- Team

### Manage
- Billing
- Profile
- Settings

Bottom:

- workspace selector
- current plan
- usage/credits

## Top bar

Include:

- breadcrumb
- current page/project
- global search
- notifications
- help
- profile/avatar
- Create/New App CTA

On mobile:

- hamburger
- logo
- page title
- compact actions
- slide-out navigation

---

# 12. DASHBOARD — COMMAND CENTER

The dashboard must answer immediately:

**What should I do next?**

Top:

- welcome message
- Create New App
- Import App
- Browse Templates

Main sections:

### Continue building
Recent projects with:

- project icon
- name
- description
- framework
- status
- version
- last updated
- continue button

### Usage
- credits remaining
- credits used
- plan
- renewal
- upgrade

### Recent activity
Use real stored activity.

### Recommended templates
Use real templates.

### Deployment status
Use real deployment state.

### Team activity
Use real team activity.

Do not show fake numbers.

---

# 13. MY APPS / PROJECTS

Create a premium project management experience.

Features:

- grid/list toggle
- search
- filters
- sort
- favorites
- folders/tags where already supported
- create app
- import app
- clone
- delete with confirmation
- project actions

Project card:

- visual thumbnail/preview
- app name
- description
- framework
- status
- version
- last edited
- favorite
- menu

Hover actions should be subtle.

---

# 14. AI BUILDER — MOST IMPORTANT PRODUCT SCREEN

This screen must receive the largest UX investment.

Use a sophisticated three-zone workspace inspired by modern creative tools:

### Left
Project/context/navigation.

### Center
AI conversation and generation workflow.

### Right
Live preview/inspector/verification.

On smaller screens, stack intelligently or allow controlled panel switching.

## Header

Show:

- project name
- save state
- version
- Preview
- Verify
- Release
- Deploy
- More

## AI composer

Support:

- multiline input
- attachments/import
- submit
- stop
- regenerate
- clear
- keyboard shortcut
- prompt suggestions

Example prompts:

- Build a fitness booking app.
- Add authentication.
- Create a dashboard.
- Add a database.
- Fix the mobile layout.
- Add payments.
- Improve the landing page.
- Add a settings page.

## AI plan before complex generation

Show:

- understanding
- requirements
- pages
- components
- navigation
- data model
- backend
- integrations
- assumptions
- risks

Actions:

- Approve
- Edit plan
- Regenerate

## AI output cards

Each generation should show:

- what happened
- progress
- files changed
- warnings
- verification
- summary
- next actions

Suggested actions:

- Continue
- Apply
- Preview
- Verify
- Fix
- Release

---

# 15. AI PROVIDER ROUTING

Preserve and harden the current architecture.

Required order:

### Normal tasks
`Groq → Cerebras → OpenRouter`

### Complex tasks
Use Anthropic Claude when:

- configured
- task is genuinely complex

Complex examples:

- large imported project
- many files
- many screens
- authentication
- database/backend
- storage
- payments
- integrations
- long requirements
- substantial refactoring

If Claude is unavailable, continue with the normal provider chain.

Do not make Claude mandatory.

Do not make Gemini mandatory.

## Failover conditions

Fail over only for:

- HTTP 429
- quota/rate limit
- temporary provider failure
- timeout
- transient network error
- temporary provider capacity issue

Do NOT fail over for:

- invalid user input
- malformed permanent configuration
- authentication failure caused by bad server configuration
- invalid prompt structure

## Provider abstraction

Keep methods similar to:

- `generateText`
- `generateProject`
- `editProject`
- `analyzeProject`

Provider-specific adapters remain isolated.

Never log:

- API key
- auth token
- service role key
- webhook secret

---

# 16. ENVIRONMENT CONFIGURATION

Keep `.env.example` complete.

Expected variables include:

```env
GROQ_API_KEY=
GROQ_MODEL=

CEREBRAS_API_KEY=
CEREBRAS_MODEL=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
ANTHROPIC_MAX_TOKENS=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

PADDLE_ENVIRONMENT=
PADDLE_CLIENT_TOKEN=
PADDLE_WEBHOOK_SECRET=
PADDLE_PRICE_STARTER=
PADDLE_PRICE_PRO=
PADDLE_PRICE_BUSINESS=

RESEND_API_KEY=
```

Also preserve legitimate existing variables such as GitHub/Sentry configuration.

Do not commit actual secrets.

---

# 17. AI PROJECT GENERATION

Generated projects must be structured and maintainable.

Separate:

- UI
- components
- routes
- API/server
- data access
- utilities
- types
- configuration

AI should:

- preserve architecture
- modify only necessary files
- avoid duplicate utilities
- avoid giant components
- avoid hardcoded secrets
- avoid unnecessary dependencies

---

# 18. AI EDITOR / ITERATION WORKFLOW

When the user asks:

- Add dark mode
- Add login
- Add dashboard
- Add database
- Change navigation
- Fix mobile layout
- Add payments

Workflow:

1. inspect relevant project context
2. understand request
3. make minimal changes
4. summarize changed files
5. verify
6. preview
7. offer rollback

Never regenerate the entire application unnecessarily.

---

# 19. FILE EXPLORER / CODE VIEWER

Support:

- folder tree
- search
- selected file
- syntax-aware code viewer/editor
- copy
- diff
- download release

Never expose secrets.

Show protected/hidden configuration appropriately.

---

# 20. DIFF / CHANGE REVIEW

Every AI edit must provide:

- changed files
- additions
- removals
- modifications
- concise summary

Actions:

- Accept
- Reject
- Undo
- Rollback

The UX should make users feel in control of AI changes.

---

# 21. PREVIEW EXPERIENCE

Support:

- desktop
- tablet
- mobile

Controls:

- refresh
- viewport
- open new tab
- console/errors when available

States:

- loading
- building
- ready
- failed

Never show "Live" unless the application is actually live.

---

# 22. VERIFICATION CENTER

Verify where possible:

- syntax
- TypeScript
- build
- imports
- missing files
- dependency issues
- security risks
- unsafe patterns
- configuration

Display:

- passed
- warnings
- errors
- recommendations

Severity:

- critical
- high
- medium
- low
- info

Allow AI Fix only when safe and clearly explain what will be changed.

---

# 23. PROJECT COMMAND CENTER

Project overview must show:

- project name
- description
- framework
- current version
- verification state
- last release
- deployment state
- usage
- activity

Quick actions:

- Builder
- Preview
- Verify
- Edit with AI
- Version
- Release
- Deploy
- Import/Export
- Settings

---

# 24. VERSIONING

Every meaningful generation/edit can become a version.

Fields:

- version
- title
- summary
- creator
- timestamp
- status
- artifact
- checksum

Actions:

- View
- Compare
- Restore
- Deploy
- Download

Immutable releases must not be silently overwritten.

---

# 25. RELEASE ARTIFACTS

Release artifacts must contain actual project files and metadata.

Store privately.

Record:

- version
- storage path
- size
- checksum

Downloads:

- authorized only
- short-lived signed URLs

Validate:

- file count
- file size
- safe paths
- archive integrity

---

# 26. DEPLOYMENT

Truthful workflow:

`Select version → Verify → Confirm → Build → Deploy → Report actual state`

States:

- queued
- building
- deploying
- live
- failed
- rolled back

Never mark live before actual success.

Generated code must never execute inside the Appo Next.js process.

If deployment infrastructure is not configured, show:

**Deployment infrastructure is not configured yet.**

Do not pretend it deployed.

---

# 27. IMPORT EXISTING APPS

Support:

- ZIP
- public GitHub repository

Security:

- upload size limit
- file count limit
- per-file limit
- path traversal protection
- absolute path rejection
- ignore `node_modules`
- ignore `.git`
- ignore build output
- validate files

Workflow:

`Import → Inspect → Summarize → Request changes → AI edit → Verify → Preview → Version`

---

# 28. MARKETPLACE / TEMPLATES

Marketplace should look like a real ecosystem.

Features:

- search
- categories
- featured
- Appo starters
- community templates
- detail page
- preview
- Use Template
- clone

Categories:

- SaaS
- ecommerce
- productivity
- booking
- fitness
- social
- CRM
- finance
- education
- marketing
- portfolio
- other

Never fabricate:

- ratings
- downloads
- users
- reviews

---

# 29. TEAM COLLABORATION

Roles:

- Owner
- Admin
- Editor
- Viewer

Features:

- workspace
- members
- invitations
- permissions
- activity

Authorization must be server-side.

Invitation tokens:

- expire
- can be revoked
- cannot be reused incorrectly

---

# 30. ACTIVITY + NOTIFICATIONS

Track real events:

- project creation
- generation
- AI edit
- verification
- release
- deployment
- rollback
- invitation
- billing
- security

Notifications:

- generation complete
- deployment success/failure
- invitations
- billing
- security alerts

Create polished notification center with unread state and real data.

---

# 31. ANALYTICS

Use real stored data only.

Metrics:

- projects
- generations
- success/failure
- deployments
- activity
- usage
- credits

If data is insufficient:

> Not enough data yet.

Never invent charts.

---

# 32. BILLING

Use Paddle when configured.

Plans:

- Free
- Starter
- Pro
- Business

UI:

- current plan
- usage
- renewal
- payment status
- upgrade
- downgrade
- cancel
- invoices when available

Never trust client-side subscription state.

Webhook requirements:

- signature verification
- timestamp/freshness protection
- idempotency
- safe retries
- payload size limit
- safe event processing

---

# 33. CREDITS / USAGE

Show:

- balance
- usage
- limits
- plan
- estimated consumption where useful

Enforce limits server-side.

Do not charge for failed operations that produced no usable result.

Use existing credits logic as the source of truth.

---

# 34. EMAIL

Use Resend when configured.

Templates:

- verification
- welcome
- password reset
- invitation
- deployment result
- billing
- security alert

Never email secrets.

---

# 35. SUPABASE

Use Supabase for:

- authentication
- PostgreSQL
- storage where configured

Review:

- RLS
- indexes
- foreign keys
- unique constraints
- timestamps
- migrations

Never expose service-role key.

Reuse equivalent existing tables instead of creating duplicates.

---

# 36. API QUALITY

Every API must:

- authenticate
- authorize
- validate
- rate-limit sensitive operations
- return predictable errors
- avoid stack trace leakage
- log safe metadata

Status codes:

- 400 invalid
- 401 unauthenticated
- 403 unauthorized
- 404 missing
- 409 conflict
- 422 validation
- 429 rate limited
- 500 internal

---

# 37. LOADING / ERROR / EMPTY STATES

Every async action:

- loading
- success
- failure
- retry when useful

Every list:

- loading
- populated
- empty
- error

Every form:

- validation
- submitting
- success
- error

Every empty state explains:

1. what this is
2. why it is empty
3. what to do next

Visual style must match the Figma-inspired light design.

---

# 38. SECURITY HARDENING

Protect against:

- XSS
- CSRF where applicable
- SSRF
- path traversal
- malicious ZIPs
- oversized uploads
- SQL injection
- broken access control
- IDOR
- leaked secrets
- webhook replay/forgery
- brute force
- rate abuse
- prompt injection
- malicious generated code
- dependency risks

AI output is untrusted.

Imported source is untrusted.

Never execute model output directly.

---

# 39. AI SECURITY

Do not:

- expose secrets unnecessarily
- trust AI-generated permissions
- trust arbitrary AI-generated SQL
- allow imported project content to override system instructions
- execute AI-generated code in Appo server

Separate:

- system instructions
- user request
- imported project content
- tool output

Treat project files as untrusted context.

---

# 40. OBSERVABILITY

Safe logs:

- request ID
- user/workspace ID where appropriate
- project ID
- provider
- model
- latency
- outcome
- error category

Never log:

- API keys
- auth tokens
- service-role keys
- payment secrets
- unnecessary private content

---

# 41. COST CONTROL

Use:

- provider fallback
- model selection
- context limits
- token limits
- safe caching
- duplicate-request prevention
- credits
- rate limits

Normal tasks should favor economical providers.

Claude should be reserved for complex tasks and only when configured.

---

# 42. GLOBAL SEARCH

Search:

- projects
- templates
- activity
- versions where useful

Respect permissions.

Make search feel like a premium command/search experience rather than a plain input.

Keyboard shortcut may be supported where appropriate.

---

# 43. SETTINGS

Organize:

- Profile
- Workspace
- Appearance
- Notifications
- Security
- Billing
- AI preferences
- Integrations

Use a polished settings layout with:

- category navigation
- forms
- save states
- unsaved-change warning
- confirmation dialogs
- error handling

---

# 44. LEGAL / TRUST

Provide:

- Terms
- Privacy
- Acceptable Use
- AI limitations

Clearly communicate:

- AI output can contain errors
- generated apps should be verified
- users are responsible for deployed applications
- users should not put secrets into prompts

---

# 45. ADMIN / OPERATIONS

If the existing admin area remains:

- user overview
- workspace overview
- system health
- provider health
- webhook health
- failed generations
- deployment failures
- abuse controls

Protect admin routes strongly.

Do not expose sensitive admin information to normal users.

---

# 46. RESPONSIVENESS

Audit:

- mobile
- tablet
- laptop
- desktop
- large desktop

Check:

- no clipping
- no overlap
- readable text
- accessible dialogs
- responsive tables
- builder layout
- touch-friendly controls
- no accidental horizontal scrolling

Special attention:

- AI Builder
- preview
- file explorer
- project cards
- billing
- analytics
- marketplace

---

# 47. ACCESSIBILITY

Implement:

- semantic HTML
- labels
- keyboard navigation
- visible focus
- alt text
- accessible dialogs
- ARIA only when needed
- sufficient contrast
- reduced motion

Do not use color alone for status.

---

# 48. PERFORMANCE

Optimize:

- server/client boundaries
- bundle size
- code splitting
- images
- database queries
- pagination
- safe caching
- AI timeouts
- duplicate requests

Do not add heavy animation libraries unless justified.

---

# 49. PAGE INVENTORY

## Public

- landing
- pricing
- marketplace
- template detail
- docs/help
- privacy
- terms

## Auth

- sign in
- sign up
- forgot password
- reset
- verification
- callback

## Authenticated

- dashboard
- onboarding
- projects
- project overview
- AI builder
- editor
- preview
- verification
- versions
- releases
- deployment
- templates
- marketplace
- analytics
- activity
- notifications
- team
- billing
- settings
- security
- profile

Use one consistent dynamic route parameter convention.

---

# 50. REUSABLE COMPONENTS TO BUILD OR REFINE

At minimum:

- AppShell
- Sidebar
- Topbar
- Breadcrumbs
- Button
- IconButton
- Input
- Textarea
- Select
- Dialog
- Drawer
- Dropdown
- Tabs
- Card
- Badge
- Tooltip
- Toast
- Alert
- EmptyState
- LoadingState
- Skeleton
- ErrorState
- ProjectCard
- TemplateCard
- UsageCard
- ActivityItem
- NotificationItem
- AIMessage
- AIComposer
- GenerationProgress
- FileTree
- CodeViewer
- DiffViewer
- PreviewFrame
- VerificationPanel
- ReleaseCard
- DeploymentStatus
- BillingCard
- TeamMember
- InvitationCard

---

# 51. FRONT-END QUALITY RULES

Every page should pass this visual checklist:

- Does it look intentionally designed?
- Is the hierarchy immediately understandable?
- Is whitespace generous?
- Are actions obvious?
- Are primary actions visually dominant?
- Are secondary actions quiet?
- Are cards consistent?
- Are borders subtle?
- Are icons consistent?
- Are hover/focus states present?
- Are loading states polished?
- Are empty states helpful?
- Are error states understandable?
- Does mobile look intentional?
- Does it feel like the same product as every other page?

Avoid:

- random gradients
- emoji-heavy UI
- inconsistent radii
- oversized shadows
- excessive glassmorphism
- noisy backgrounds
- tiny text
- cramped cards
- fake statistics
- generic placeholder content
- dead buttons
- "Coming soon" everywhere

---

# 52. FIGMA-REFERENCE TRANSLATION RULES

When translating the MelodiesFirst reference into Appo:

### Keep from the reference
- overall visual sophistication
- light visual language
- clean composition
- strong typography
- premium spacing
- polished navigation
- visual rhythm
- card quality
- image/thumbnail treatment where applicable
- subtle interaction feedback
- editorial feel
- responsive composition

### Do not copy literally
- music-player-specific labels
- music-specific information architecture
- unrelated content
- artist/song semantics
- exact branding
- copyrighted assets
- exact product copy

### Replace with Appo equivalents
Music/content areas → App/project/AI-builder areas.

Player-style central content → AI Builder/Project Preview.

Playlists/collections → Projects/Templates.

Track metadata → Version/build/verification metadata.

Music discovery → Template/Marketplace discovery.

Player actions → Preview/Verify/Edit/Release actions.

The result must clearly be **Appo**, not a music website.

---

# 53. IMAGE / ASSET STRATEGY

Use real project assets where already provided.

Do not hotlink random images.

Do not introduce copyrighted Figma assets unless properly licensed.

For templates/projects, use:

- generated previews
- local assets
- safe placeholders
- project screenshots when actually available

Do not fabricate user-generated content.

---

# 54. DATA MODEL / BACKEND CHECKLIST

Maintain appropriate entities for:

- profiles
- workspaces
- workspace members
- projects/apps
- project files/artifacts
- versions
- releases
- deployments
- activity
- notifications
- templates
- subscriptions
- usage/credits
- invitations
- webhook events

Reuse existing equivalent tables.

Review RLS policies for every user/workspace/project resource.

Test cross-tenant access explicitly.

---

# 55. TESTING REQUIREMENTS

Test:

### Authentication
- signup
- signin
- logout
- password reset
- verification
- protected routes

### Authorization
- owner
- admin
- editor
- viewer
- unauthorized project
- unauthorized artifact
- cross-workspace access

### AI
- Groq success
- Groq 429 → Cerebras
- Cerebras temporary failure → OpenRouter
- OpenRouter temporary failure → truthful error
- Claude configured for complex task
- Claude absent
- timeout
- quota
- invalid input

### Project
- create
- generate
- edit
- diff
- accept
- reject
- verify
- version
- rollback
- release
- download

### Import
- valid ZIP
- oversized ZIP
- too many files
- unsafe path
- absolute path
- node_modules
- .git
- valid public GitHub
- invalid GitHub

### Billing
- Paddle signature
- webhook replay
- idempotency
- subscription state
- cancellation
- client cannot forge plan

### Security
- IDOR
- RLS
- signed URLs
- webhook verification
- path traversal
- XSS-sensitive inputs
- prompt injection boundaries

### UI
- mobile
- tablet
- desktop
- loading
- error
- empty
- keyboard
- reduced motion

---

# 56. QUALITY GATE

Do not declare completion until:

- route conflicts resolved
- type errors resolved
- AI routing works
- Claude optional
- Gemini not required
- auth works
- authorization works
- RLS reviewed
- billing webhook secure
- import secure
- release artifacts immutable
- deployment states truthful
- marketplace works
- mobile UI works
- tests pass
- production build passes when dependencies/environment are actually available
- no critical dead buttons
- loading/empty/error states polished
- front-end visually consistent
- Figma-inspired light design consistently applied
- existing functionality preserved

---

# 57. IMPLEMENTATION PHASES

Work incrementally.

## Phase 0 — Repository audit
- inspect all files
- inspect package.json
- inspect routes
- inspect API routes
- inspect migrations
- inspect env
- inspect provider router
- inspect auth
- inspect billing
- inspect storage
- inspect tests
- inspect current UI
- inspect Figma reference if accessible

Deliver an audit before modifying anything.

## Phase 1 — Design system
- create light design tokens
- typography
- spacing
- radius
- shadows
- motion
- accessibility
- reusable components

## Phase 2 — App shell
- sidebar
- topbar
- responsive navigation
- workspace/plan/usage
- mobile drawer

## Phase 3 — Landing/auth/onboarding
- landing
- pricing
- auth
- onboarding
- trust/legal presentation

## Phase 4 — Dashboard/projects
- dashboard
- project cards
- project search/filter
- activity
- usage

## Phase 5 — AI Builder
- three-panel layout
- plan
- conversation
- generation
- progress
- preview
- verification

## Phase 6 — Project editing
- editor
- file tree
- diff
- rollback
- version history

## Phase 7 — Templates/import
- marketplace
- templates
- template detail
- ZIP import
- GitHub import

## Phase 8 — Release/deployment
- release
- artifact
- deployment states
- rollback
- truthful unavailable states

## Phase 9 — Team/analytics/activity
- collaboration
- invitations
- analytics
- notifications
- activity

## Phase 10 — Billing/usage/email
- Paddle
- credits
- usage
- Resend

## Phase 11 — Security/performance/accessibility
- RLS
- authorization
- rate limits
- input validation
- upload security
- prompt injection protection
- performance
- accessibility

## Phase 12 — Full QA
- run tests
- typecheck
- build if environment allows
- fix actual failures
- route audit
- dead-button audit
- responsive audit
- security audit
- visual consistency audit

## Phase 13 — Final polish
- micro-interactions
- spacing
- typography
- loading states
- empty states
- error states
- copy
- transitions
- responsive details

---

# 58. PHASE REPORTING FORMAT

After each phase, report:

### Phase
Name

### Changed
Exact files/features changed.

### Verified
Only checks actually executed.

### Not verified
Anything requiring unavailable external services/environment.

### Remaining
Known issues.

### Status
Use:

- 🟢 Verified
- 🟡 Partially verified
- 🔴 Failed

Never mark something green without an actual check.

---

# 59. IMPORTANT CURRENT-REPOSITORY CONSTRAINTS

The repository's README explicitly notes that its environment may lack network access and that some real integrations cannot be executed offline.

Therefore:

- do not fake live provider tests
- do not fake Paddle tests
- do not fake Supabase production tests
- do not fake Expo preview rendering
- do not fake deployment
- do not claim `next build` succeeded unless it actually did

If dependencies are unavailable:

1. run what can actually run
2. report the limitation
3. keep implementation correct
4. do not invent results

---

# 60. FINAL USER JOURNEY TEST

A brand-new user must be able to:

1. visit Appo
2. understand the product quickly
3. sign up
4. onboard
5. create a project
6. describe an app
7. receive an AI plan
8. generate a project
9. preview it
10. edit it with AI
11. review changes
12. verify it
13. create a version
14. release it
15. deploy when infrastructure is configured
16. return and continue editing
17. import an existing app
18. use a template
19. collaborate
20. track usage
21. manage billing
22. protect their data and secrets

---

# 61. DEFINITION OF "PROFESSIONAL"

The final Appo product should feel comparable in polish to a serious modern SaaS product.

It should have:

- coherent visual system
- clear information architecture
- fast interactions
- trustworthy status reporting
- polished states
- strong responsive behavior
- secure APIs
- robust authorization
- reliable data handling
- maintainable code
- realistic AI workflows
- useful onboarding
- understandable billing
- useful analytics
- professional marketing
- excellent project-building UX

It must not feel like:

- an MVP demo
- a template with changed colors
- a collection of mock pages
- a prototype
- an AI wrapper with fake buttons

---

# 62. DO NOT BREAK THESE EXISTING PRODUCT CAPABILITIES

Before changing any UI, verify that these existing areas remain functional where already implemented:

- AI generation
- AI provider failover
- AI prompt engineering
- AI chatbot
- Supabase
- Paddle
- credits
- version history
- rollback
- release artifacts
- deployment APIs
- import
- GitHub export
- templates
- collaboration
- analytics
- activity
- account export/deletion
- Sentry/error reporting
- rate limiting
- admin
- legal pages
- onboarding
- favorites/share functionality

If an existing implementation is incomplete, improve it rather than deleting it.

---

# 63. FILE-BY-FILE CHANGE DISCIPLINE

Before editing a file:

1. understand its current purpose
2. identify callers/importers
3. identify data/API dependencies
4. preserve public interfaces unless a migration is justified
5. make the smallest safe change
6. test impacted behavior

Do not create duplicate routes.

Do not create conflicting dynamic route parameters.

Do not leave unused imports/components.

Do not leave obsolete styles after migration.

Do not leave two competing design systems active.

---

# 64. DESIGN MIGRATION REQUIREMENT

The current project contains a dark Aurora theme. The final product requested by the owner is **light-first and inspired by the supplied Figma reference**.

Therefore:

- migrate the visual system centrally
- do not patch page-by-page with random colors
- remove obsolete dark-only tokens
- preserve semantic status colors
- ensure contrast
- update shared components first
- then pages
- then special surfaces

The final UI should look intentionally designed in the new system from the first screen to the last.

---

# 65. FINAL CODE QUALITY REQUIREMENTS

Before final completion:

- no obvious TypeScript errors
- no broken imports
- no dead routes
- no dead navigation
- no fake success states
- no secret leakage
- no client-side authorization trust
- no unvalidated dangerous inputs
- no unsafe ZIP extraction
- no arbitrary code execution
- no duplicate model/router logic
- no unnecessary dependencies
- no obvious accessibility violations
- no mobile overflow
- no inconsistent design tokens
- no console noise caused by avoidable errors

---

# 66. OWNER'S ORIGINAL MASTER SPECIFICATION

The supplied `Appo-Complete-SaaS-Product-Specification.md` remains the authoritative functional specification.

**Do not silently remove requirements from it.**

Use this document as the implementation/visual extension of that specification.

If there is any conflict:

1. preserve security and data integrity
2. preserve real existing functionality
3. preserve the owner's functional requirements
4. apply the Figma reference to visual/UX presentation
5. explain any unavoidable conflict before making a destructive decision

---

# 67. FINAL INSTRUCTION TO CLAUDE

**Now work on the supplied Appo ZIP repository.**

Do not merely describe how to make the changes.

Actually modify the repository.

Start with a complete audit.

Then implement the phases incrementally.

For each phase:

- inspect
- modify
- test
- fix
- report

Do not skip hard parts.

Do not replace real functionality with mock UI.

Do not claim completion early.

The final result must be a **complete, professional, production-oriented Appo AI SaaS application builder with a premium light Figma-inspired front end, robust backend architecture, real AI provider fallback, optional Claude for complex tasks, Supabase, Paddle, Resend, secure project handling, verification, versioning, releases, templates, import, collaboration, analytics, billing and polished responsive UX.**

The final product must feel coherent, trustworthy, fast, polished and ready for real users once the owner's external production credentials/infrastructure are configured.

---

# 68. REFERENCE: CURRENT AI PROVIDER CONTRACT

The repository currently implements the requested general architecture around:

- Groq
- Cerebras
- OpenRouter
- Anthropic

Preserve the required routing order and improve error classification rather than replacing the architecture.

The owner's desired order is:

**Groq → Cerebras → OpenRouter → Claude for complex tasks when configured.**

---

# 69. REFERENCE: CURRENT ENVIRONMENT CONTRACT

The repository already contains an `.env.example` with variables for:

- Supabase
- Groq
- Cerebras
- OpenRouter
- Anthropic
- Paddle
- GitHub
- Sentry

Preserve valid existing variables and document any newly required ones.

Never commit actual secrets.

---

# 70. COMPLETION STATEMENT

When all phases are genuinely complete, provide:

1. summary of implemented features
2. complete route inventory
3. API inventory
4. database/migration changes
5. environment variables
6. AI provider routing behavior
7. security changes
8. visual redesign summary
9. tests actually run
10. tests not runnable and why
11. production setup requirements
12. known limitations
13. final quality-gate result

Do not say "100% complete" if any required area remains unimplemented or unverified.

---

## END OF CLAUDE MASTER IMPLEMENTATION PROMPT

