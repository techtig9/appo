"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { groupByDay, NOTIFICATION_CATEGORY_LABELS } from "@/lib/notifications";
import type { NotificationCategory } from "@/lib/supabase/types";

/**
 * Notification centre.
 *
 * Everything the product does on the user's behalf — a sign-in, a
 * generation, a deployment, a billing change, a team invitation — leaves a
 * record here, with read state and a filter per category.
 */

interface NotificationRow {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  severity: "info" | "success" | "warning" | "error";
  read_at: string | null;
  created_at: string;
}

const CATEGORIES: (NotificationCategory | "all")[] = [
  "all",
  "generation",
  "deployment",
  "billing",
  "team",
  "auth",
  "project",
  "system",
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [timedOut, setTimedOut] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setTimedOut(false);

    // Requirement: never an infinite "Loading…". If nothing has come back
    // in ten seconds the user gets a recoverable error instead.
    const timeout = window.setTimeout(() => setTimedOut(true), 10_000);

    try {
      const query = new URLSearchParams({ limit: "60" });
      if (filter !== "all") query.set("category", filter);
      if (onlyUnread) query.set("unread", "true");

      const response = await fetch(`/api/notifications?${query}`);
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const payload = (await response.json()) as { notifications: NotificationRow[]; unread: number };
      setRows(payload.notifications);
      setUnread(payload.unread);
      setStatus("ready");
    } catch {
      setStatus("error");
    } finally {
      window.clearTimeout(timeout);
    }
  }, [filter, onlyUnread]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markAllRead() {
    // Optimistic: the list updates immediately and is reconciled by the
    // reload below. A failure restores the true state from the server.
    setRows((current) => current.map((row) => ({ ...row, read_at: row.read_at ?? new Date().toISOString() })));
    setUnread(0);

    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    });

    if (!response.ok) {
      toast({ title: "Couldn't mark everything as read", tone: "error" });
    }
    void load();
  }

  async function markOneRead(id: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, read_at: new Date().toISOString() } : row)));
    setUnread((current) => Math.max(0, current - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", ids: [id] }),
    }).catch(() => {});
  }

  const groups = useMemo(() => groupByDay(rows), [rows]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-page font-semibold tracking-tight text-ink">Notifications</h1>
          <p className="mt-1.5 text-small text-ink-secondary">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <button type="button" onClick={markAllRead} className="btn btn-secondary btn-sm">
            Mark all as read
          </button>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="-mx-1 flex flex-1 gap-1.5 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              aria-pressed={filter === category}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors duration-micro",
                filter === category
                  ? "border-brand-border bg-brand-subtle text-brand"
                  : "border-line bg-canvas-subtle text-ink-secondary hover:border-line-strong hover:text-ink"
              )}
            >
              {category === "all" ? "All" : NOTIFICATION_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-caption text-ink-secondary">
          <input
            type="checkbox"
            checked={onlyUnread}
            onChange={(event) => setOnlyUnread(event.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--app-brand)]"
          />
          Unread only
        </label>
      </div>

      {status === "loading" ? <LoadingState label="Loading notifications…" timedOut={timedOut} onRetry={() => void load()} /> : null}
      {status === "error" ? (
        <ErrorState detail="We couldn't load your notifications." onRetry={() => void load()} />
      ) : null}

      {status === "ready" && rows.length === 0 ? (
        <EmptyState
          title={onlyUnread ? "Nothing unread" : "No notifications yet"}
          description={
            onlyUnread
              ? "You've read everything in this view. Turn off the unread filter to see your history."
              : "Notifications appear here when an app finishes generating, a deployment completes, or something changes on your account."
          }
          action={{ label: "Build something", href: "/dashboard/generator" }}
        />
      ) : null}

      {status === "ready" && groups.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-ink-muted">{group.label}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
                {group.items.map((row) => (
                  <li key={row.id}>
                    <NotificationRowView row={row} onRead={() => markOneRead(row.id)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const SEVERITY_DOT: Record<string, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-danger",
};

function NotificationRowView({ row, onRead }: { row: NotificationRow; onRead: () => void }) {
  const unread = !row.read_at;

  const content = (
    <div className={cn("flex gap-3 px-4 py-3.5 transition-colors duration-micro", unread ? "bg-brand-subtle/40" : "hover:bg-canvas-subtle")}>
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", SEVERITY_DOT[row.severity])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className={cn("truncate text-small", unread ? "font-semibold text-ink" : "text-ink-secondary")}>{row.title}</p>
          <time
            dateTime={row.created_at}
            className="ml-auto shrink-0 text-caption text-ink-muted"
            title={new Date(row.created_at).toLocaleString()}
          >
            {relativeTime(row.created_at)}
          </time>
        </div>
        {row.body ? <p className="mt-1 line-clamp-2 text-caption leading-relaxed text-ink-secondary">{row.body}</p> : null}
        <p className="mt-1.5 text-caption text-ink-muted">{NOTIFICATION_CATEGORY_LABELS[row.category]}</p>
      </div>
      {unread ? (
        <span className="sr-only">Unread</span>
      ) : null}
    </div>
  );

  if (row.href) {
    return (
      <Link href={row.href} onClick={onRead} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onRead} className="block w-full text-left">
      {content}
    </button>
  );
}

/** Short relative time. Falls back to a date once it stops being useful. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
