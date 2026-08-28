"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Deployment = { id: string; app_id: string; platform: string; build_id: string | null; store_status: string; deployment_url: string | null; ota_channel: string | null; version_id: string | null; status: string; is_current: boolean; released_at: string | null; rolled_back_at: string | null; previous_deployment_id: string | null };
type App = { id: string; name: string; custom_subdomain: string | null };

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const load = () => Promise.all([fetch("/api/deployments").then(r => r.json()), fetch("/api/apps").then(r => r.json())]).then(([d, a]) => { setDeployments(d.deployments ?? []); setApps(a.apps ?? []); }).finally(() => setLoading(false));
  useEffect(() => { void load(); }, []);
  const name = (id: string) => apps.find(a => a.id === id)?.name ?? "Untitled app";
  const downloadArtifact = async (appId: string, versionId: string | null) => {
    if (!versionId) { setMessage("This release has no artifact version."); return; }
    const res = await fetch(`/api/apps/${appId}/releases/${versionId}/download`);
    const data = await res.json();
    if (!res.ok || !data.url) { setMessage(data.error ?? "Release artifact unavailable."); return; }
    window.open(data.url, "_blank", "noopener,noreferrer");
  };
  const rollback = async (id: string) => {
    if (!window.confirm("Rollback this release to the previous live version?")) return;
    setBusy(id); setMessage(null);
    const res = await fetch(`/api/deployments/${id}/rollback`, { method: "POST" });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setMessage(data.error ?? "Rollback failed."); return; }
    setMessage("Release rolled back successfully.");
    await load();
  };
  return <div className="fade-in space-y-6">
    <header><div className="eyebrow">RELEASES</div><h1 className="mt-1 text-3xl font-semibold text-white">Deployments</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Track production releases, inspect the current version, and safely roll back when needed.</p></header>
    {message && <div className="glass-card border border-cyan-400/20 p-4 text-sm text-slate-200">{message}</div>}
    {loading ? <div className="glass-card p-6 text-sm text-slate-400">Loading releases…</div> : deployments.length === 0 ? <div className="glass-card p-8 text-center"><p className="text-lg font-semibold text-white">No deployments yet</p><p className="mt-2 text-sm text-slate-400">Generate an app, verify it, then publish a web release from My Apps.</p><Link href="/dashboard/apps" className="btn-accent mt-5 inline-flex">Open My Apps →</Link></div> : <div className="space-y-3">{deployments.map(d => <div key={d.id} className="glass-card flex flex-col gap-4 p-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-semibold text-white">{name(d.app_id)}</h2><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${d.is_current ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{d.is_current ? "current" : d.status}</span></div><p className="mt-1 text-xs text-slate-500">{d.platform} · {d.build_id ?? "release"} · v{d.version_id ? "linked" : "legacy"} · {d.ota_channel ?? "production"}</p>{d.released_at && <p className="mt-1 text-xs text-slate-500">Released {new Date(d.released_at).toLocaleString()}</p>}</div><div className="flex flex-col gap-2 sm:flex-row">{d.deployment_url && <a href={d.deployment_url} target="_blank" rel="noreferrer" className="btn-outline text-center text-sm">Open release ↗</a>}{d.platform === "web" && d.version_id && <button onClick={() => downloadArtifact(d.app_id, d.version_id)} className="btn-outline text-center text-sm">Download artifact</button>}{d.platform === "web" && d.is_current && d.previous_deployment_id && <button disabled={busy === d.id} onClick={() => rollback(d.id)} className="btn-outline text-center text-sm disabled:opacity-50">{busy === d.id ? "Rolling back…" : "Rollback"}</button>}</div></div>)}</div>}
  </div>;
}
