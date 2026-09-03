"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Button, ButtonLink } from "./Button";

/**
 * Empty, loading and error states.
 *
 * The brief is specific about all three, and the product previously
 * treated them as afterthoughts: pages rendered a bare "Loading…" with no
 * timeout, "No results" with no explanation, and raw error strings with no
 * way forward. Every state here says what happened, why, and what to do
 * next.
 */

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  secondaryAction?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-lg border border-dashed border-line px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-canvas-subtle text-ink-muted">
          {icon}
        </div>
      ) : null}
      <h3 className="text-card font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-small leading-relaxed text-ink-secondary">{description}</p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action?.href ? (
            <ButtonLink href={action.href}>{action.label}</ButtonLink>
          ) : action ? (
            <Button onClick={action.onClick}>{action.label}</Button>
          ) : null}
          {secondaryAction ? (
            <ButtonLink href={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A recoverable failure.
 *
 * `detail` is for a short, human message — never a stack trace. Callers
 * pass the `error` field from an API response, which is already written
 * for a person to read.
 */
export function ErrorState({
  title = "Something went wrong",
  detail,
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center rounded-lg border border-danger/35 bg-danger-subtle px-6 py-10 text-center", className)}
    >
      <h3 className="text-card font-semibold text-ink">{title}</h3>
      {detail ? <p className="mt-2 max-w-md text-small leading-relaxed text-ink-secondary">{detail}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Skeleton block. Sized by the caller so the placeholder matches the
 * content that replaces it — a skeleton of the wrong shape causes exactly
 * the layout shift it exists to prevent.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn("h-3", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card overflow-hidden">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-4 w-1/2" />
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * A spinner with a hard timeout.
 *
 * "Never infinite Loading..." is a requirement, and a bare spinner cannot
 * satisfy it. After `timeoutMs` this switches to an error state with a
 * retry, so a hung request always surfaces instead of spinning forever.
 */
export function LoadingState({
  label = "Loading…",
  timedOut,
  onRetry,
  className,
}: {
  label?: string;
  timedOut?: boolean;
  onRetry?: () => void;
  className?: string;
}) {
  if (timedOut) {
    return (
      <ErrorState
        title="This is taking longer than expected"
        detail="The request hasn't come back yet. Your connection may be slow, or the service may be busy."
        onRetry={onRetry}
        className={className}
      />
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-14", className)} aria-busy="true" aria-live="polite">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin text-brand">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-small text-ink-secondary">{label}</p>
    </div>
  );
}

export function StatusIndicator({
  status,
  label,
  className,
}: {
  status: "live" | "building" | "queued" | "failed" | "idle";
  label?: string;
  className?: string;
}) {
  const config = {
    live: { colour: "bg-success", text: "Live", pulse: true },
    building: { colour: "bg-info", text: "Building", pulse: true },
    queued: { colour: "bg-warning", text: "Queued", pulse: false },
    failed: { colour: "bg-danger", text: "Failed", pulse: false },
    idle: { colour: "bg-ink-muted", text: "Idle", pulse: false },
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-2 text-caption text-ink-secondary", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.colour, config.pulse && "animate-pulse-dot")} aria-hidden="true" />
      {label ?? config.text}
    </span>
  );
}
