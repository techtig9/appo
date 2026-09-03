import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign-in problem — Appo",
  robots: { index: false, follow: false },
};

/**
 * Where a failed OAuth exchange lands. The old behaviour for every one of
 * these cases was a blank page, so each reason gets a specific, honest
 * explanation and a next step — never a stack trace and never a spinner.
 */

const REASONS: Record<string, { title: string; body: string; hint?: string }> = {
  missing_code: {
    title: "That sign-in link is incomplete",
    body: "The link you followed didn't include the code Appo needs to finish signing you in. This usually happens when a link is opened from a preview pane, or when part of the URL was cut off by an email client.",
    hint: "Start the sign-in again from the login page.",
  },
  exchange_failed: {
    title: "That sign-in link has expired",
    body: "Sign-in codes are single-use and short-lived. This one had already been used, had expired, or was started in a different browser from the one that finished it.",
    hint: "Signing in again from this browser will work.",
  },
  provider_error: {
    title: "Your sign-in provider reported a problem",
    body: "Google couldn't complete the sign-in. This is usually temporary, but it can also mean the account is restricted by a Google Workspace policy.",
    hint: "Try again, or sign in with your email and password instead.",
  },
  default: {
    title: "We couldn't complete your sign-in",
    body: "Something went wrong while finishing the sign-in. Your account is safe and no changes were made.",
    hint: "Try again — if it keeps happening, contact support.",
  },
};

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: { reason?: string; description?: string };
}) {
  const reason = REASONS[searchParams.reason ?? ""] ?? REASONS.default;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="card w-full max-w-md p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-warning/35 bg-warning-subtle text-lg text-warning">
          <span aria-hidden="true">!</span>
        </div>

        <h1 className="mt-5 text-xl font-semibold text-ink">{reason.title}</h1>
        <p className="mt-3 text-small leading-relaxed text-ink-secondary">{reason.body}</p>

        {/* The provider's own description, when it sent one. It is
            attacker-influencable text from a query string, so it is
            rendered as plain text inside a bordered block and never as
            markup or a link. */}
        {searchParams.description ? (
          <p className="mt-4 rounded-md border border-line bg-canvas-subtle px-3 py-2 font-mono text-caption leading-5 text-ink-muted">
            {searchParams.description.slice(0, 200)}
          </p>
        ) : null}

        {reason.hint ? <p className="mt-4 text-small text-ink-muted">{reason.hint}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="btn btn-primary"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="btn btn-secondary"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
