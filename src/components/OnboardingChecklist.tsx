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
          <p className="mt-1 text-xs text-slate-500">{done} of {steps.length} complete · {percent}%</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/get-started" className="text-xs font-medium text-violet-200 hover:text-white">Open guide</Link>
          <button onClick={dismiss} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-gradient-to-r from-violet to-fuchsia" style={{ width: `${percent}%` }} />
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${step.done ? "bg-violet text-white" : "border border-white/15 text-slate-500"}`}>{step.done ? "✓" : ""}</span>
            <span className={step.done ? "text-slate-400 line-through" : "text-slate-200"}>{step.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
