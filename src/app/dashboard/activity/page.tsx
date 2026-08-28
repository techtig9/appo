"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Activity = { id: string; type: "app" | "version" | "deployment" | "team"; title: string; description: string; createdAt: string; appId?: string; appName?: string; status?: string };
const FILTERS = ["all", "app", "version", "deployment", "team"] as const;

function Icon({ type }: { type: Activity["type"] }) {
  const symbol = type === "deployment" ? "↗" : type === "version" ? "✦" : type === "team" ? "◎" : "+";
  return <span className="thumb-tile h-10 w-10">{symbol}</span>;
}

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export default function ActivityPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/activity")
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Couldn't load activity."); return data; })
      .then((data) => setItems(data.items ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => filter === "all" ? items : items.filter((item) => item.type === filter), [filter, items]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-300">Workspace history</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Activity</h1><p className="mt-2 text-sm text-slate-400">A clear timeline of what is happening across your Appo workspace.</p></div>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Back to overview</Link>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((value) => <button key={value} onClick={() => setFilter(value)} className={`rounded-full border px-3.5 py-2 text-xs font-medium capitalize transition ${filter === value ? "border-violet/40 bg-violet/15 text-violet-100" : "border-white/10 bg-white/[.025] text-slate-400 hover:text-white"}`}>{value}</button>)}
      </div>

      <section className="mt-5 overflow-hidden rounded-3xl border border-white/[.08] bg-white/[.025]">
        {loading && <div className="p-10 text-center text-sm text-slate-500">Loading workspace activity…</div>}
        {!loading && error && <div className="p-10 text-center text-sm text-rose-300">{error}</div>}
        {!loading && !error && visible.length === 0 && <div className="p-14 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[.04] text-xl text-slate-400">◌</div><h2 className="mt-4 text-sm font-semibold text-white">Nothing here yet</h2><p className="mt-1 text-sm text-slate-500">Create an app or deploy a project and your activity will appear here.</p><Link href="/dashboard/generator" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950">Create an app</Link></div>}
        {!loading && !error && visible.length > 0 && <div className="divide-y divide-white/[.06]">{visible.map((item) => <div key={item.id} className="data-row flex gap-4 p-5 sm:p-6"><Icon type={item.type}/><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-white">{item.title}</p><time className="text-[11px] text-slate-600">{formatTime(item.createdAt)}</time></div><p className="mt-1 text-sm leading-6 text-slate-400">{item.description}</p>{item.appId && <Link href={`/dashboard/apps?app=${encodeURIComponent(item.appId)}`} className="mt-2 inline-block text-xs font-medium text-violet-300 hover:text-violet-200">Open {item.appName ?? "app"} →</Link>}</div></div>)}</div>}
      </section>
    </div>
  );
}
