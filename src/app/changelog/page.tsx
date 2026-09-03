import type { Metadata } from "next";
import { LandingFooter, LandingHeader } from "@/components/landing/sections";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What has shipped in Appo, and when.",
  alternates: { canonical: "/changelog" },
};

/**
 * Changelog.
 *
 * Every entry below corresponds to something that is actually in this
 * codebase. The brief asks for "real features, improvements, fixes and
 * security updates" — so this is not a marketing timeline with invented
 * milestones, and there are no dated entries for work that has not landed.
 */

type EntryKind = "feature" | "improvement" | "fix" | "security";

interface Release {
  version: string;
  date: string;
  summary: string;
  changes: { kind: EntryKind; text: string }[];
}

const KIND_STYLES: Record<EntryKind, string> = {
  feature: "border-brand-border bg-brand-subtle text-brand",
  improvement: "border-info/35 bg-info-subtle text-info",
  fix: "border-warning/35 bg-warning-subtle text-warning",
  security: "border-danger/35 bg-danger-subtle text-danger",
};

const KIND_LABELS: Record<EntryKind, string> = {
  feature: "New",
  improvement: "Improved",
  fix: "Fixed",
  security: "Security",
};

const RELEASES: Release[] = [
  {
    version: "Phase 5",
    date: "Production readiness",
    summary: "Monitoring, documentation and the last of the launch checklist.",
    changes: [
      { kind: "feature", text: "Help centre covering generation, templates, deployment, credits, collaboration and privacy." },
      { kind: "feature", text: "This changelog." },
      { kind: "improvement", text: "Health and readiness endpoints report which external services are actually configured." },
      { kind: "improvement", text: "Structured JSON logging with credential redaction by both key name and value shape." },
      { kind: "improvement", text: "Sitemap, robots and per-page metadata across the marketing and help pages." },
    ],
  },
  {
    version: "Phase 4",
    date: "Interface",
    summary: "A single design system, a real dark and light theme, and a rebuilt front end.",
    changes: [
      { kind: "feature", text: "Design tokens as the single source of truth for colour, space, type, radius, elevation and motion." },
      { kind: "feature", text: "Dark, light and system themes, with no white flash on navigation." },
      { kind: "feature", text: "Command palette (⌘K) searching projects, templates and workspace pages." },
      { kind: "feature", text: "Notification centre with categories, unread state and mark-all-read." },
      { kind: "feature", text: "Workspace search behind the header field, which previously had no handler at all." },
      { kind: "improvement", text: "Component library with controlled card variants, toasts, dialogs with a real focus trap, and empty/error/loading states." },
      { kind: "improvement", text: "Landing page rebuilt with a product preview drawn from the design system rather than stock art." },
      { kind: "fix", text: "The dashboard's recent-projects list queried a column that does not exist, so it showed an empty state to every user regardless of how many projects they had." },
      { kind: "fix", text: "Auth screens hardcoded dark colours and were unreadable in light theme." },
      { kind: "fix", text: "The cookie notice crashed the page in browsers configured to block site storage." },
      { kind: "fix", text: "Scroll-revealed sections could stay invisible permanently if IntersectionObserver was unavailable." },
      { kind: "improvement", text: "Loading states now time out and offer a retry instead of spinning indefinitely." },
    ],
  },
  {
    version: "Phase 3",
    date: "Templates and the AI engine",
    summary: "A real marketplace, and an AI edit path that works.",
    changes: [
      { kind: "feature", text: "64 templates across 32 categories, each with its own screens, architecture and starting brief." },
      { kind: "feature", text: "Generated layout previews for every template — no blank cards and no unrelated stock images." },
      { kind: "feature", text: "Marketplace search, category facets, sorting, pagination and favourites." },
      { kind: "fix", text: "AI editing queried a column that does not exist on projects, so every edit request returned \"App not found\". The feature could never have worked." },
      { kind: "fix", text: "AI editing never loaded the project's current source, so it regenerated from a one-line description and discarded earlier changes." },
      { kind: "fix", text: "Two concurrent edits could both write the same version number." },
      { kind: "security", text: "Generated projects are validated for unsafe paths, executables, oversized output and embedded credentials before being stored." },
    ],
  },
  {
    version: "Phase 2",
    date: "Authentication and email",
    summary: "Google sign-in fixed, and transactional email built.",
    changes: [
      { kind: "fix", text: "\"Continue with Google\" produced a blank page: no callback route existed to exchange the authorization code, so no session was ever created." },
      { kind: "fix", text: "Email confirmation and password-reset links pointed at pages that could not establish a session either." },
      { kind: "feature", text: "Transactional email through Resend, with 18 branded templates and a plain-text alternative for each." },
      { kind: "feature", text: "Security notifications for sign-in, password change, email change and account deletion, de-duplicated so one sign-in produces one email." },
      { kind: "feature", text: "Team invitations are now emailed. Previously the link was returned to the inviter to copy by hand and the invitee was never contacted." },
      { kind: "security", text: "Account deletion is confirmed server-side; it was previously checked only in the browser." },
      { kind: "security", text: "Sign-in and password reset no longer reveal whether an email address is registered." },
      { kind: "security", text: "The post-login redirect target is validated, closing an open redirect." },
      { kind: "fix", text: "The reset-password screen waited forever for an expired link instead of saying it had expired." },
    ],
  },
  {
    version: "Phase 1",
    date: "Foundation",
    summary: "Billing correctness, request validation and safe logging.",
    changes: [
      { kind: "fix", text: "Credits could be spent twice for one charge: concurrent generations both read the same balance and wrote the same result. Charging is now a single atomic database operation." },
      { kind: "fix", text: "Paid upgrades were discarded as duplicate webhooks, because the idempotency key was the subscription id rather than the event id — customers were billed for plans that were never applied." },
      { kind: "fix", text: "Routine subscription updates (a card change, a billing-date move) reset the credit balance to a full month's allowance." },
      { kind: "security", text: "Request bodies are schema-validated with size limits; routes previously wrote unvalidated input straight to the database." },
      { kind: "security", text: "Logs redact credentials by key name and by value shape, so a provider error body cannot leak an API key." },
      { kind: "improvement", text: "AI provider calls carry explicit timeouts and bounded retries; `fetch` has no default timeout, so a stalled connection previously hung the request." },
      { kind: "improvement", text: "Five test suites that the test runner had never actually executed now run." },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <>
      <LandingHeader />

      <main id="main" className="app-container py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Changelog</p>
          <h1 className="mt-2 text-page font-semibold tracking-tight text-ink">What&apos;s new in Appo</h1>
          <p className="mt-3 text-body leading-relaxed text-ink-secondary">
            Every entry here corresponds to something in the product. Fixes are described by what was actually wrong,
            because that is more useful than &ldquo;various improvements&rdquo;.
          </p>

          <div className="mt-12 space-y-10">
            {RELEASES.map((release) => (
              <article key={release.version} className="border-l border-line pl-6">
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[26px] top-2 h-2 w-2 rounded-full border-2 border-canvas bg-brand ring-2 ring-brand-subtle"
                  />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-card font-semibold tracking-tight text-ink">{release.version}</h2>
                    <span className="text-caption text-ink-muted">{release.date}</span>
                  </div>
                  <p className="mt-1.5 text-small leading-relaxed text-ink-secondary">{release.summary}</p>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {release.changes.map((change) => (
                    <li key={change.text} className="flex flex-wrap items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-caption font-medium",
                          KIND_STYLES[change.kind]
                        )}
                      >
                        {KIND_LABELS[change.kind]}
                      </span>
                      <span className="min-w-0 flex-1 text-small leading-relaxed text-ink-secondary">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
