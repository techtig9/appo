"use client";

import { useEffect, useMemo, useState } from "react";

interface Template { id: string; category?: string; name: string; thumbnail?: string | null; platforms?: string[]; tags?: string[]; created_at?: string; }

const categories = ["all", "fitness", "ecommerce", "productivity", "social", "booking"];

export default function TemplatesPage() {
  const [seedTemplates, setSeedTemplates] = useState<Template[]>([]);
  const [communityTemplates, setCommunityTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [cloneStatus, setCloneStatus] = useState<Record<string, string>>({});

  async function loadTemplates() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category !== "all") params.set("category", category);
    try {
      const res = await fetch(`/api/templates?${params.toString()}`);
      const data = await res.json();
      setSeedTemplates(data.seedTemplates ?? []);
      setCommunityTemplates(data.communityTemplates ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadTemplates(); }, [category]);

  async function useTemplate(id: string) {
    setCloneStatus((prev) => ({ ...prev, [id]: "Creating…" }));
    const res = await fetch(`/api/apps/${id}/clone-template`, { method: "POST" });
    const data = await res.json();
    setCloneStatus((prev) => ({ ...prev, [id]: res.ok ? "Added to Your Apps ✓" : data.error ?? "Couldn't use template" }));
  }

  const total = useMemo(() => seedTemplates.length + communityTemplates.length, [seedTemplates, communityTemplates]);

  return (
    <div className="fade-in space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-300">APP MARKETPLACE</p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Start with a proven app</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">Pick a foundation, add your idea, and let Appo turn it into a working product.</p>
        </div>
        <span className="pill">{total} available</span>
      </div>

      <div className="glass-card flex flex-col gap-3 p-4 md:flex-row">
        <input aria-label="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && loadTemplates()} placeholder="Search templates…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" />
        <button onClick={loadTemplates} className="btn-accent px-5">Search</button>
        <select aria-label="Filter category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white">
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c[0].toUpperCase() + c.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <div className="glass-card p-8 text-center text-slate-400">Loading marketplace…</div> : (
        <>
          <section>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Appo starters</h2><span className="text-xs text-slate-500">Fastest way to begin</span></div>
            {seedTemplates.length === 0 ? <div className="glass-card p-6 text-sm text-slate-400">No starter templates match your search.</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{seedTemplates.map((t) => <TemplateCard key={t.id} template={t} status={cloneStatus[t.id]} onUse={useTemplate} />)}</div>}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Community templates</h2><span className="text-xs text-slate-500">Built by Appo creators</span></div>
            {communityTemplates.length === 0 ? <div className="glass-card p-6 text-sm text-slate-400">No community templates match your search yet.</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{communityTemplates.map((t) => <TemplateCard key={t.id} template={t} status={cloneStatus[t.id]} onUse={useTemplate} community />)}</div>}
          </section>
        </>
      )}
    </div>
  );
}

function TemplateCard({ template, status, onUse, community = false }: { template: Template; status?: string; onUse: (id: string) => void; community?: boolean }) {
  return <article className="glass-card group flex min-h-[210px] flex-col justify-between p-5 transition-transform hover:-translate-y-0.5">
    <div><div className="flex items-center justify-between"><span className="pill">{community ? "Community" : template.category}</span><span className="text-xs text-slate-500">{template.platforms?.join(" · ") || "Web"}</span></div><h3 className="mt-4 text-lg font-semibold text-white">{template.name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">A ready-made product foundation. Start here, then describe exactly what you want Appo to build.</p>{template.tags?.length ? <div className="mt-3 flex flex-wrap gap-1">{template.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-violet/10 px-2 py-0.5 text-xs text-violet-200">{tag}</span>)}</div> : null}</div>
    <button disabled={Boolean(status && !status.includes("Couldn't"))} onClick={() => onUse(template.id)} className="btn-accent mt-5 w-full text-sm">{status ?? "Use this template"}</button>
  </article>;
}
