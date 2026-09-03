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
      <div className="w-full max-w-md rounded-2xl border border-[#272A33] bg-[#13151A] p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-lg text-[#F59E0B]">
          <span aria-hidden="true">!</span>
        </div>

        <h1 className="mt-5 text-xl font-semibold text-[#F5F7FA]">{reason.title}</h1>
        <p className="mt-3 text-sm leading-6 text-[#A1A7B3]">{reason.body}</p>

        {/* The provider's own description, when it sent one. It is
            attacker-influencable text from a query string, so it is
            rendered as plain text inside a bordered block and never as
            markup or a link. */}
        {searchParams.description ? (
          <p className="mt-4 rounded-lg border border-[#272A33] bg-[#0F1014] px-3 py-2 font-mono text-xs leading-5 text-[#717784]">
            {searchParams.description.slice(0, 200)}
          </p>
        ) : null}

        {reason.hint ? <p className="mt-4 text-sm text-[#717784]">{reason.hint}</p> : null}

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[#7C5CFF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6B4AF0]"
          >
            Back to sign in
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-[#272A33] px-4 py-2.5 text-sm font-medium text-[#F5F7FA] transition hover:border-[#3A3E4A]"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
