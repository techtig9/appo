"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface AppData { id:string; name:string; description?:string|null; version:string; build_number:number; platforms:string[]; tags:string[]; folder?:string|null; share_slug?:string|null; custom_subdomain?:string|null; is_favorite:boolean; created_at:string; }
interface Version { id:string; version_number:number; change_summary:string|null; created_at:string; }
interface Deployment { id:string; platform:string; build_id:string|null; store_status:string; deployment_url:string|null; status:string; is_current:boolean; released_at:string|null; rolled_back_at:string|null; version_id:string|null; }

export default function AppProjectPage({ params }: { params: { id: string } }) {
  const [app, setApp] = useState<AppData|null>(null);
  const [role, setRole] = useState("owner");
  const [versions, setVersions] = useState<Version[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    fetch(`/api/apps/${params.id}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Couldn't load this app.");
      setApp(data.app); setRole(data.role ?? "owner"); setVersions(data.versions ?? []); setDeployments(data.deployments ?? []);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [params.id]);

  const live = useMemo(() => deployments.find((d) => d.is_current && d.status === "live") ?? deployments.find((d) => d.status === "live"), [deployments]);
  const latest = versions[0];
  const canEdit = role !== "viewer";

  if (loading) return <div className="space-y-5"><div className="h-8 w-72 animate-pulse rounded bg-white/5"/><div className="grid gap-4 md:grid-cols-3">{[1,2,3].map((x)=><div key={x} className="h-28 animate-pulse rounded-2xl bg-white/5"/>)}</div></div>;
  if (error || !app) return <div className="glass-card p-8"><p className="text-sm text-fuchsia-200">{error || "App not found."}</p><Link href="/dashboard/apps" className="mt-4 inline-block text-sm text-violet-200 underline">Back to apps</Link></div>;

  return <div className="fade-in space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link href="/dashboard/apps" className="text-xs text-slate-500 hover:text-white">← All apps</Link>
        <div className="mt-3 flex flex-wrap items-center gap-2"><span className="eyebrow">PROJECT COMMAND CENTER</span><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{role}</span></div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{app.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{app.description || "Your AI-generated application workspace."}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canEdit && <><Link href={`/dashboard/generator?app=${app.id}`} className="btn-outline">Continue building</Link><button onClick={() => { setEditOpen(true); setEditMessage(""); }} className="btn-accent">Ask AI to edit</button></>}
        {live?.deployment_url && <a href={live.deployment_url} target="_blank" rel="noreferrer" className="btn-outline">Open live app ↗</a>}
        <Link href="/dashboard/deployments" className="btn-outline">Releases</Link>
      </div>
    </div>

    {editOpen && <section className="glass-card border-violet/20 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><span className="eyebrow">AI PROJECT EDITOR</span><h2 className="mt-2 font-semibold">Describe one change</h2><p className="mt-1 text-xs text-slate-500">Appo will create a new version while preserving unrelated project behavior. Cost: 100 credits.</p></div><button onClick={() => setEditOpen(false)} className="text-slate-500 hover:text-white">✕</button></div>
      <textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)} maxLength={2000} placeholder="Example: Add a dark-mode toggle to the Settings screen and remember the user's choice." className="mt-5 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none focus:border-violet/50" />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-slate-600">{editInstruction.length}/2000</span><div className="flex gap-2"><button onClick={() => setEditOpen(false)} className="btn-outline">Cancel</button><button disabled={editBusy || editInstruction.trim().length < 4} onClick={async () => { setEditBusy(true); setEditMessage(""); try { const r = await fetch(`/api/apps/${app.id}/edit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: editInstruction }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Edit failed"); setEditMessage(`Version ${d.version.version_number} created successfully.`); setEditInstruction(""); setVersions(v => [d.version, ...v]); } catch (e) { setEditMessage(e instanceof Error ? e.message : "Edit failed."); } finally { setEditBusy(false); } }} className="btn-accent disabled:opacity-50">{editBusy ? "Building…" : "Create new version"}</button></div></div>
      {editMessage && <p className="mt-3 text-xs text-violet-200">{editMessage}</p>}
    </section>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat title="Current version" value={`v${app.version}`} detail={`Build #${app.build_number}`} />
      <Stat title="Platforms" value={app.platforms?.length ? app.platforms.join(" · ") : "Web"} detail="Configured targets" />
      <Stat title="Releases" value={String(deployments.length)} detail={live ? `${live.platform} is live` : "No live release yet"} />
      <Stat title="Versions" value={String(versions.length)} detail="Recent project snapshots" />
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="glass-card p-5 sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold">Build timeline</h2><p className="mt-1 text-xs text-slate-500">Recent versions and release milestones.</p></div><Link href="/dashboard/activity" className="text-xs text-violet-200">Activity →</Link></div>
        <div className="mt-6 space-y-3">
          {versions.length === 0 ? <Empty text="No versions have been recorded yet."/> : versions.map(v => <div key={v.id} className="data-row flex gap-3 rounded-2xl border border-white/5 bg-white/[.02] p-4"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet shadow-[0_0_12px_rgba(139,92,246,.5)]"/><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="text-sm font-medium">Version {v.version_number}</p><time className="text-[11px] text-slate-600">{new Date(v.created_at).toLocaleString()}</time></div><p className="mt-1 text-xs text-slate-500">{v.change_summary || "AI-generated project snapshot"}</p></div></div>)}
        </div>
      </section>

      <section className="glass-card p-5 sm:p-6">
        <h2 className="font-semibold">Project details</h2><div className="mt-5 space-y-4 text-xs">
          <Detail label="Folder" value={app.folder || "Unsorted"}/><Detail label="Bundle ID" value={app.id}/><Detail label="Created" value={new Date(app.created_at).toLocaleDateString()}/><Detail label="Share link" value={app.share_slug ? `/preview/${app.share_slug}` : "Not created"}/><Detail label="Custom domain" value={app.custom_subdomain || "Not configured"}/>
        </div>
        <div className="mt-5 flex flex-wrap gap-1">{(app.tags ?? []).map(t=><span key={t} className="rounded-full bg-violet/10 px-2 py-1 text-[11px] text-violet-200">{t}</span>)}</div>
      </section>
    </div>

    <section className="glass-card p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><h2 className="font-semibold">Releases</h2><p className="mt-1 text-xs text-slate-500">Track what's live and what was shipped before.</p></div><Link href="/dashboard/deployments" className="text-xs text-violet-200">Manage releases →</Link></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-slate-600"><tr><th className="pb-3">Platform</th><th className="pb-3">Build</th><th className="pb-3">Status</th><th className="pb-3">Released</th><th className="pb-3">Action</th></tr></thead><tbody>{deployments.map(d=><tr key={d.id} className="data-row border-t border-white/5"><td className="py-3 font-medium text-slate-200">{d.platform}</td><td className="py-3 text-slate-500">{d.build_id || "—"}</td><td className="py-3"><span className={`rounded-full px-2 py-1 ${d.status === "live" ? "bg-emerald-500/10 text-emerald-200" : d.status === "failed" ? "bg-fuchsia-500/10 text-fuchsia-200" : "bg-white/5 text-slate-400"}`}>{d.status}{d.is_current ? " · current" : ""}</span></td><td className="py-3 text-slate-500">{d.released_at ? new Date(d.released_at).toLocaleString() : "—"}</td><td className="py-3">{d.deployment_url ? <a href={d.deployment_url} target="_blank" rel="noreferrer" className="text-violet-200 underline">Open</a> : "—"}</td></tr>)}</tbody></table>{deployments.length === 0 && <Empty text="No releases yet. Deploy this project when it's ready."/>}</div>
    </section>
  </div>;
}

function Stat({title,value,detail}:{title:string;value:string;detail:string}){return <div className="glass-card p-5"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 truncate text-xl font-bold text-white">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></div>}
function Detail({label,value}:{label:string;value:string}){return <div><p className="text-slate-600">{label}</p><p className="mt-1 break-all text-slate-300">{value}</p></div>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">{text}</div>}
