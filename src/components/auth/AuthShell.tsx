"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared chrome for the four auth screens.
 *
 * They previously each rolled their own markup with different input
 * classes, no labels (placeholder-only, which fails screen readers and
 * disappears the moment you type), and no loading state on submit. This
 * gives all of them one accessible, consistent presentation.
 */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-semibold tracking-tight text-ink">Appo</span>
        </Link>

        <div className="card p-7 sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-small text-ink-secondary">{subtitle}</p> : null}
          <div className="mt-6">{children}</div>
        </div>

        {footer ? <p className="mt-6 text-center text-small text-ink-secondary">{footer}</p> : null}

        <p className="mt-8 text-center text-caption leading-5 text-ink-muted">
          By continuing you agree to Appo&apos;s{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-ink-secondary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink-secondary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  minLength,
  trailing,
  hint,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  trailing?: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-caption font-medium text-ink-secondary">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="input h-11"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function AuthSubmit({
  busy,
  busyLabel,
  children,
}: {
  busy?: boolean;
  busyLabel?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="btn btn-primary h-11 w-full disabled:cursor-not-allowed"
    >
      {busy ? <Spinner /> : null}
      {busy ? busyLabel ?? "Working…" : children}
    </button>
  );
}

export function GoogleButton({
  busy,
  onClick,
  label,
}: {
  busy?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="btn btn-secondary h-11 w-full gap-2.5 disabled:cursor-not-allowed"
    >
      {busy ? <Spinner /> : <GoogleMark />}
      {busy ? "Opening Google…" : label}
    </button>
  );
}

export function AuthNotice({ tone, children }: { tone: "error" | "info" | "success"; children: ReactNode }) {
  const styles = {
    error: "border-danger/35 bg-danger-subtle text-danger",
    info: "border-info/30 bg-info-subtle text-info",
    success: "border-success/30 bg-success-subtle text-success",
  }[tone];

  return (
    <p
      // Announced to screen readers: a validation failure that is only
      // visible is invisible to anyone not looking at that part of the page.
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2.5 text-small leading-5 ${styles}`}
    >
      {children}
    </p>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
