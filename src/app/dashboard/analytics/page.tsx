"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Data = {
  summary: { apps:number; versions:number; deployments:number; liveDeployments:number; favoriteApps:number; creditsUsed:number; creditsRemaining:number; creditsGranted:number; plan:string };
  series: Array<{date:string; apps:number; versions:number; deployments:number}>;
  platforms: Array<{name:string; value:number}>;
  deploymentStatus: Array<{name:string; value:number}>;
  recentApps: Array<{id:string; name:string; platforms:string[]; created_at:string}>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/analytics").then(async r => { const json = await r.json(); if (!r.ok) throw new Error(json.error ?? "Couldn't load analytics."); return json; }).then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="glass-card p-8"><p className="font-semibold text-white">Analytics unavailable</p><p className="mt-2 text-sm text-slate-400">{error}</p></div>;
  if (!data) return <div className="glass-card p-8 text-sm text-slate-400">Loading workspace analytics…</div>;
  const s = data.summary;
  const creditPct = s.creditsGranted ? Math.min(100, Math.round((s.creditsUsed / s.creditsGranted) * 100)) : 0;
  const prettyDate = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return <div className="fade-in space-y-7">
    <header><div className="eyebrow">WORKSPACE INSIGHTS</div><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="mt-1 text-3xl font-semibold text-white">Analytics</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Understand what you are building, how often you ship, and where your AI credits are going.</p></div><Link href="/dashboard/generator" className="btn-accent">Build something new →</Link></div></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Apps created" value={s.apps} detail={`${s.favoriteApps} favorited`} />
      <Metric label="Versions generated" value={s.versions} detail="Across your workspace" />
      <Metric label="Deployments" value={s.deployments} detail={`${s.liveDeployments} currently live`} />
      <Metric label="AI credits used" value={s.creditsUsed} detail={`${creditPct}% of ${s.creditsGranted.toLocaleString()} allocated`} progress={creditPct} />
    </section>
    <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="glass-card p-5 sm:p-6"><div><h2 className="text-base font-semibold text-white">Build activity</h2><p className="mt-1 text-xs text-slate-500">Your last 14 days of app, version and release activity.</p></div><div className="mt-6 h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.series}><defs><linearGradient id="appFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopOpacity={0.35}/><stop offset="100%" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false}/><XAxis dataKey="date" tickFormatter={prettyDate} tick={{fill:"#64748b",fontSize:11}} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{fill:"#64748b",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#10101b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#fff"}} labelFormatter={prettyDate}/><Area type="monotone" dataKey="versions" stroke="#a78bfa" fill="url(#appFill)" strokeWidth={2} name="Versions"/><Area type="monotone" dataKey="deployments" stroke="#22d3ee" fill="none" strokeWidth={2} name="Deployments"/></AreaChart></ResponsiveContainer></div></div>
      <div className="glass-card p-5 sm:p-6"><h2 className="text-base font-semibold text-white">Platforms</h2><p className="mt-1 text-xs text-slate-500">Platforms selected across your apps.</p><div className="mt-5 h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.platforms} layout="vertical" margin={{left:8,right:12}}><CartesianGrid stroke="rgba(255,255,255,.06)" horizontal={false}/><XAxis type="number" allowDecimals={false} hide/><YAxis type="category" dataKey="name" tick={{fill:"#94a3b8",fontSize:12}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:"#10101b",border:"1px solid rgba(255,255,255,.1)",borderRadius:12,color:"#fff"}}/><Bar dataKey="value" fill="#8b5cf6" radius={[0,8,8,0]} name="Apps"/></BarChart></ResponsiveContainer></div></div>
    </section>
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="glass-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-white">AI budget</h2><p className="mt-1 text-xs text-slate-500">Current {s.plan} plan allocation.</p></div><Link href="/dashboard/billing" className="text-xs font-medium text-violet-200">Manage plan →</Link></div><div className="mt-6"><div className="flex items-end justify-between"><span className="text-3xl font-bold text-white">{s.creditsRemaining.toLocaleString()}</span><span className="text-xs text-slate-500">credits remaining</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet to-fuchsia" style={{width:`${creditPct}%`}}/></div><div className="mt-3 flex justify-between text-[11px] text-slate-500"><span>{s.creditsUsed.toLocaleString()} used</span><span>{s.creditsGranted.toLocaleString()} total</span></div></div></div>
      <div className="glass-card p-5 sm:p-6"><h2 className="text-base font-semibold text-white">Recent projects</h2><p className="mt-1 text-xs text-slate-500">The latest apps in your workspace.</p><div className="mt-4 space-y-2">{data.recentApps.length ? data.recentApps.map(app => <Link href="/dashboard/apps" key={app.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.02] p-3 hover:bg-white/[.05]"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/10 text-sm font-semibold text-violet-100">{app.name.slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{app.name}</p><p className="text-[11px] text-slate-500">{(app.platforms ?? []).join(" · ")} · {new Date(app.created_at).toLocaleDateString()}</p></div><span className="text-slate-600">→</span></Link>) : <p className="py-8 text-center text-sm text-slate-500">No apps yet.</p>}</div></div>
    </section>
  </div>;
}

function Metric({label,value,detail,progress}:{label:string;value:number;detail:string;progress?:number}) { return <div className="glass-card p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-white">{value.toLocaleString()}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p>{progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet to-fuchsia" style={{width:`${progress}%`}}/></div>}</div>; }
