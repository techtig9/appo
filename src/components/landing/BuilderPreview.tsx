import { cn } from "@/components/ui/cn";

/**
 * The hero's product shot.
 *
 * Deliberately a real, styled rendering of Appo's own builder layout —
 * the same three-pane arrangement, the same generation stages, the same
 * tokens — rather than a stock illustration or an invented screenshot of
 * a product that does not look like this. It is built from the design
 * system, so it cannot drift away from what the app actually looks like.
 *
 * Static markup with no client JavaScript: this is the largest thing above
 * the fold and it should cost nothing to interact with.
 */

const FILES = [
  { name: "app", depth: 0, folder: true },
  { name: "(tabs)", depth: 1, folder: true },
  { name: "index.tsx", depth: 2, active: true },
  { name: "classes.tsx", depth: 2 },
  { name: "bookings.tsx", depth: 2 },
  { name: "components", depth: 0, folder: true },
  { name: "ClassCard.tsx", depth: 1 },
  { name: "BookingSheet.tsx", depth: 1 },
  { name: "lib", depth: 0, folder: true },
  { name: "supabase.ts", depth: 1 },
];

const STAGES = [
  { label: "Analysing request", state: "done" as const },
  { label: "Planning application", state: "done" as const },
  { label: "Creating architecture", state: "done" as const },
  { label: "Generating components", state: "active" as const },
  { label: "Validating project", state: "pending" as const },
  { label: "Preparing preview", state: "pending" as const },
];

export function BuilderPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-hero border border-line bg-surface shadow-lg",
        className
      )}
      // Decorative in the sense that the surrounding copy already explains
      // the product; the label gives screen readers the gist without
      // reading out every fake filename.
      role="img"
      aria-label="The Appo builder: a file explorer, an AI generation panel showing build stages, and a live app preview."
    >
      {/* Window chrome */}
      <div className="flex h-9 items-center gap-2 border-b border-line bg-canvas-subtle px-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <div className="ml-3 flex h-5 items-center rounded border border-line bg-surface px-2 font-mono text-[10px] text-ink-muted">
          appo.app/dashboard/apps/studio-booking
        </div>
        <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-ink-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Autosaved
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[150px_minmax(0,1fr)_190px] lg:grid-cols-[172px_minmax(0,1fr)_230px]">
        {/* File explorer */}
        <div className="hidden border-r border-line bg-canvas-subtle p-3 md:block">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Explorer</p>
          <ul className="space-y-0.5 font-mono text-[11px]">
            {FILES.map((file) => (
              <li
                key={`${file.depth}-${file.name}`}
                style={{ paddingLeft: `${file.depth * 10}px` }}
                className={cn(
                  "flex items-center gap-1.5 truncate rounded px-1.5 py-1",
                  file.active ? "bg-brand-subtle text-brand" : file.folder ? "text-ink-secondary" : "text-ink-muted"
                )}
              >
                <span aria-hidden="true" className="text-[9px] opacity-60">
                  {file.folder ? "▾" : "·"}
                </span>
                {file.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Centre pane */}
        <div className="min-w-0 border-b border-line md:border-b-0">
          <div className="flex items-center gap-1 border-b border-line px-3 py-2">
            {["AI", "Code", "Design", "Preview", "Console"].map((tab, index) => (
              <span
                key={tab}
                className={cn(
                  "rounded px-2 py-1 text-[11px]",
                  index === 0 ? "bg-brand-subtle font-medium text-brand" : "text-ink-muted"
                )}
              >
                {tab}
              </span>
            ))}
          </div>

          <div className="space-y-3 p-4">
            <div className="flex gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-line bg-canvas-subtle text-[10px] font-semibold text-ink-secondary">
                You
              </div>
              <p className="text-small leading-relaxed text-ink-secondary">
                A booking app for a fitness studio — class schedule, member accounts, waitlists and an owner dashboard.
              </p>
            </div>

            <div className="rounded-lg border border-line bg-canvas-subtle p-3.5">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ai" />
                <span className="text-[11px] font-medium text-ink">Appo is building your app</span>
                <span className="ml-auto font-mono text-[10px] text-ink-muted">4 / 6</span>
              </div>

              <ul className="space-y-2">
                {STAGES.map((stage) => (
                  <li key={stage.label} className="flex items-center gap-2.5 text-[11px]">
                    <StageMark state={stage.state} />
                    <span className={stage.state === "pending" ? "text-ink-muted" : "text-ink-secondary"}>{stage.label}</span>
                    {stage.state === "active" ? (
                      <span className="ml-auto font-mono text-[10px] text-ai">14 files</span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
                <div className="h-full w-[62%] rounded-full bg-brand" />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5">
              <span className="text-[11px] text-ink-muted">Ask Appo to change something…</span>
              <span className="ml-auto rounded bg-brand px-2 py-1 text-[10px] font-medium text-brand-contrast">Send</span>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="border-l-0 border-line bg-canvas-subtle p-4 md:border-l">
          <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Live preview</p>
          <div className="mx-auto w-[150px] overflow-hidden rounded-xl border border-line-strong bg-surface shadow-md lg:w-[180px]">
            <div className="flex h-5 items-center justify-center bg-canvas-subtle">
              <span className="h-1 w-8 rounded-full bg-line-strong" />
            </div>
            <div className="space-y-2 p-2.5">
              <div className="h-2 w-16 rounded bg-line-strong" />
              <div className="h-1.5 w-24 rounded bg-line" />
              {[0, 1, 2].map((index) => (
                <div key={index} className="rounded-md border border-line p-2">
                  <div className="flex items-center justify-between">
                    <div className="h-1.5 w-12 rounded bg-line-strong" />
                    <div className={cn("h-3 w-8 rounded", index === 0 ? "bg-brand" : "bg-line")} />
                  </div>
                  <div className="mt-1.5 h-1 w-16 rounded bg-line" />
                </div>
              ))}
            </div>
            <div className="flex justify-around border-t border-line px-2 py-2">
              {[0, 1, 2, 3].map((index) => (
                <span key={index} className={cn("h-2 w-2 rounded-sm", index === 0 ? "bg-brand" : "bg-line")} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageMark({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-success">
        <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
        <path d="m7.5 12.5 3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === "active") {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 animate-spin text-ai">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className="h-[13px] w-[13px] shrink-0 rounded-full border border-line" aria-hidden="true" />;
}
