"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/Button";

/**
 * The dashboard's "describe your app" entry point.
 *
 * It hands the text to the AI Builder rather than generating from here.
 * Generating costs credits and needs the follow-up questions the builder
 * asks; kicking one off from a single-line box on the overview page would
 * spend a user's balance on a brief they have not finished writing.
 */

const SUGGESTIONS = [
  "A booking app for a fitness studio with class schedules and waitlists",
  "An internal CRM with a drag-and-drop deal pipeline",
  "A habit tracker with streaks and a monthly heat map",
];

export function DashboardPrompt({ className }: { className?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const idea = value.trim();
    if (!idea) return;
    setBusy(true);
    router.push(`/dashboard/generator?idea=${encodeURIComponent(idea)}`);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <form onSubmit={submit} className="card card-ai p-3">
        <label htmlFor="app-idea" className="sr-only">
          Describe the app you want to build
        </label>
        <textarea
          id="app-idea"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            // Enter submits, Shift+Enter adds a line — the convention for
            // a prompt box people write a sentence or two into.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit(event as unknown as React.FormEvent);
            }
          }}
          rows={2}
          placeholder="Describe the app you want to build…"
          className="w-full resize-none bg-transparent px-2 pt-1.5 text-body text-ink outline-none placeholder:text-ink-muted"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line px-2 pt-3">
          <p className="text-caption text-ink-muted">
            You will review the full brief before anything is generated.
          </p>
          <Button type="submit" size="sm" disabled={!value.trim()} loading={busy} loadingLabel="Opening builder…">
            Generate with AI
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <span className="text-caption text-ink-muted">Try:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setValue(suggestion)}
            className="rounded-full border border-line bg-canvas-subtle px-2.5 py-1 text-caption text-ink-secondary transition-colors duration-micro hover:border-line-strong hover:text-ink"
          >
            {suggestion.length > 46 ? `${suggestion.slice(0, 46)}…` : suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
