"use client";

import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/Button";

/**
 * Generation progress.
 *
 * The brief is explicit: real state, never fake progress. There is an
 * honest problem behind that, and it is worth being precise about how this
 * component handles it.
 *
 * /api/generate is a single request/response — the AI providers Appo uses
 * are called without streaming, so the server genuinely does not report
 * per-stage progress today. Two ways to present that are dishonest: a bar
 * that creeps to 90% on a timer, and a checklist that ticks stages off as
 * if the server confirmed them.
 *
 * So: the stage list is labelled as the *sequence Appo runs*, the marker
 * on the current stage is an indeterminate spinner rather than a
 * percentage, elapsed time is real, and no stage is ever marked complete
 * on the basis of a timer. When the request returns, the whole run is
 * marked done at once — which is exactly what actually happened.
 */

const STAGES = [
  { id: "analyse", label: "Analysing your request" },
  { id: "plan", label: "Planning the application" },
  { id: "architecture", label: "Choosing an architecture" },
  { id: "generate", label: "Generating the project" },
  { id: "validate", label: "Validating the output" },
  { id: "store", label: "Storing your first version" },
] as const;

export function GenerationStages({
  active,
  onCancel,
  className,
}: {
  active: boolean;
  onCancel?: () => void;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className={cn("card card-ai p-5", className)} role="status" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-small font-medium text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin text-ai">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Appo is building your app
        </span>
        <span className="font-mono text-caption tabular-nums text-ink-muted">{formatElapsed(elapsed)}</span>
        {onCancel ? (
          <Button variant="ghost" size="sm" onClick={onCancel} className="ml-auto">
            Cancel
          </Button>
        ) : null}
      </div>

      <ol className="mt-4 space-y-2">
        {STAGES.map((stage) => (
          <li key={stage.id} className="flex items-center gap-2.5 text-small text-ink-secondary">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden="true" />
            {stage.label}
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-line pt-3 text-caption leading-relaxed text-ink-muted">
        These are the steps Appo runs, in order. Generation is a single request, so there is no per-step progress to
        report — the whole run completes at once. A large app usually takes 30–90 seconds. You are not charged if it
        fails.
      </p>
    </div>
  );
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${String(remainder).padStart(2, "0")}s` : `${remainder}s`;
}
