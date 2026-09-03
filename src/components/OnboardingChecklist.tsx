"use client";

import Link from "next/link";
import { useState } from "react";
import type { OnboardingStep } from "@/lib/onboarding";

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const [dismissed, setDismissed] = useState(false);

  async function dismiss() {
    setDismissed(true);
    await fetch("/api/account/onboarding-complete", { method: "POST" }).catch(() => {});
  }

  if (dismissed) return null;

  const done = steps.filter((step) => step.done).length;
  const percent = Math.round((done / Math.max(steps.length, 1)) * 100);
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold">Getting started</h3>
          <p className="mt-1 text-xs text-ink-muted">{done} of {steps.length} complete · {percent}%</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/get-started" className="text-xs font-medium text-brand hover:text-ink">Open guide</Link>
          <button onClick={dismiss} className="text-xs text-ink-secondary hover:text-ink">Dismiss</button>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-canvas-subtle">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${step.done ? "bg-brand text-ink" : "border border-line text-ink-muted"}`}>{step.done ? "✓" : ""}</span>
            <span className={step.done ? "text-ink-secondary line-through" : "text-ink"}>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
