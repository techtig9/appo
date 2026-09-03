import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * The card system.
 *
 * The brief is explicit: controlled variants, not random per-page designs.
 * Every card in the product comes from this file, so a "metric card" looks
 * the same on the dashboard as it does in analytics, and adding a new
 * treatment means adding a variant here rather than inventing one inline.
 */
export type CardVariant =
  | "default"
  | "glass"
  | "elevated"
  | "interactive"
  | "featured"
  | "metric"
  | "ai"
  | "status";

export type CardTone = "neutral" | "success" | "warning" | "danger" | "info";

const VARIANTS: Record<CardVariant, string> = {
  default: "card",
  glass: "card card-glass",
  elevated: "card card-elevated",
  interactive: "card card-interactive",
  featured: "card card-featured",
  metric: "card card-metric",
  ai: "card card-ai",
  status: "card",
};

const TONES: Record<CardTone, string> = {
  neutral: "",
  success: "card-status-success",
  warning: "card-status-warning",
  danger: "card-status-danger",
  info: "border-info/35 bg-info-subtle",
};

export interface CardProps {
  variant?: CardVariant;
  tone?: CardTone;
  className?: string;
  children: ReactNode;
  /** Renders as <article> when the card is a self-contained item. */
  as?: "div" | "article" | "section" | "li";
}

export function Card({ variant = "default", tone = "neutral", className, children, as: Tag = "div" }: CardProps) {
  return <Tag className={cn(VARIANTS[variant], TONES[tone], className)}>{children}</Tag>;
}

export function CardHeader({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: ReactNode }) {
  return <h3 className={cn("text-card font-semibold tracking-tight text-ink", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("mt-1 text-small leading-relaxed text-ink-secondary", className)}>{children}</p>;
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex items-center gap-3 border-t border-line px-5 py-4", className)}>{children}</div>;
}

/**
 * The compact number tile used across the dashboard and analytics.
 *
 * `delta` is only rendered when a real comparison value is supplied — the
 * previous dashboard drew "+12%" chips that were not computed from
 * anything, which is exactly the kind of invented statistic that makes a
 * product untrustworthy.
 */
export function MetricCard({
  label,
  value,
  hint,
  delta,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  delta?: { value: number; label: string };
  icon?: ReactNode;
  className?: string;
}) {
  const positive = (delta?.value ?? 0) >= 0;

  return (
    <Card variant="metric" className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption font-medium uppercase tracking-wider text-ink-muted">{label}</span>
        {icon ? <span className="text-ink-muted">{icon}</span> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-page font-semibold tabular-nums tracking-tight text-ink">{value}</span>
        {delta ? (
          <span
            className={cn(
              "text-caption font-medium tabular-nums",
              positive ? "text-success" : "text-danger"
            )}
            title={delta.label}
          >
            {positive ? "+" : ""}
            {delta.value}%
          </span>
        ) : null}
      </div>
      {hint ? <p className="text-caption text-ink-muted">{hint}</p> : null}
    </Card>
  );
}
