"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppRow } from "@/lib/supabase/types";

interface AppVersion {
  id: string;
  version_number: number;
  change_summary: string | null;
  created_at: string;
}

export default function AppsPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [folder, setFolder] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "favorite">("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [historyOpenFor, setHistoryOpenFor] = useState<string | null>(null);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [githubPromptFor, setGithubPromptFor] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [githubStatus, setGithubStatus] = useState("");
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deployMessage, setDeployMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
    fetch(`/api/apps${query}`)
      .then((r) => r.json())
      .then((data) => setApps(data.apps ?? []))
      .finally(() => setLoading(false));
  }, [folder]);

  const folders = Array.from(new Set(apps.map((a) => a.folder).filter(Boolean))) as string[];

  async function cloneApp(id: string) {
    const res = await fetch(`/api/apps/${id}/clone`, { method: "POST" });
    if (res.ok) {
      const { app } = await res.json();
      setApps((prev) => [app, ...prev]);
    }
  }

  async function toggleFavorite(id: string) {
    const res = await fetch(`/api/apps/${id}/favorite`, { method: "POST" });
    if (res.ok) {
      const { app: updated } = await res.json();
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, is_favorite: updated.is_favorite } : a)));
    }
  }

  async function shareApp(id: string) {
    const res = await fetch(`/api/apps/${id}/share`, { method: "POST" });
    if (res.ok) {
      const { shareSlug } = await res.json();
      const url = `${window.location.origin}/preview/${shareSlug}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    }
  }

  async function toggleHistory(id: string) {
    if (historyOpenFor === id) {
      setHistoryOpenFor(null);
      return;
    }
    setHistoryError("");
    setHistoryOpenFor(id);
    const res = await fetch(`/api/apps/${id}/versions`);
    const data = await res.json();
    if (res.ok) {
      setVersions(data.versions ?? []);
    } else {
      setVersions([]);
      setHistoryError(data.error ?? "Couldn't load version history.");
    }
  }

  async function restoreVersion(appId: string, versionId: string) {
    if (!confirm("Restore this version? Your current version will be replaced.")) return;
    const res = await fetch(`/api/apps/${appId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) {
      setHistoryOpenFor(null);
      // Re-fetch the list so the restored version/build number shows immediately.
      const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
      const listRes = await fetch(`/api/apps${query}`);
      const data = await listRes.json();
      setApps(data.apps ?? []);
    }
  }

  async function pushToGithub(id: string) {
    if (!githubToken.trim()) return;
    setGithubStatus("Pushing…");
    const res = await fetch(`/api/apps/${id}/github-export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubAccessToken: githubToken.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setGithubStatus(`Pushed to ${data.repoUrl}`);
    } else {
      setGithubStatus(data.error ?? "Push failed.");
    }
  }

  async function togglePublishTemplate(id: string) {
    const res = await fetch(`/api/apps/${id}/publish-template`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, is_public_template: data.app.is_public_template } : a)));
    } else {
      alert(data.error ?? "Couldn't update template gallery status.");
    }
  }

  async function deployWeb(id: string) {
    setDeployingId(id);
    const res = await fetch("/api/deploy/web", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appId: id }) });
    const data = await res.json();
    setDeployingId(null);
    if (res.ok) {
      setDeployMessage((prev) => ({ ...prev, [id]: "Live release created." }));
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      setDeployMessage((prev) => ({ ...prev, [id]: data.error ?? "Deployment failed." }));
    }
  }

  async function requestBuild(id: string, platform: "ios" | "android") {
    const res = await fetch(`/api/build/${platform}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appId: id }),
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message ?? `${platform === "ios" ? "App Store" : "Play Store"} build queued.`);
    } else {
      alert(data.error ?? "Couldn't queue that build.");
    }
  }

  const visibleApps = apps.filter((app) => {
    const query = search.trim().toLowerCase();
    return !query || app.name.toLowerCase().includes(query) || (app.tags ?? []).some((tag) => tag.toLowerCase().includes(query));
  });

  const sortedApps = [...visibleApps].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "favorite") return Number(b.is_favorite) - Number(a.is_favorite) || a.name.localeCompare(b.name);
    return Number(b.is_favorite) - Number(a.is_favorite) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="fade-in space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="eyebrow">PROJECT WORKSPACE</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">Your Apps</h1>
          <p className="mt-1 text-sm text-slate-400">{apps.length} project{apps.length === 1 ? "" : "s"} in your workspace</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps or tags…"
            aria-label="Search apps"
            className="glass-card min-w-[220px] px-3 py-2 text-sm outline-none"
          />
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className="glass-card px-3 py-2 text-sm" aria-label="Filter by folder">
            <option value="">All folders</option>
            {folders.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="glass-card px-3 py-2 text-sm" aria-label="Sort apps">
            <option value="recent">Recently updated</option>
            <option value="favorite">Favorites first</option>
            <option value="name">Name A–Z</option>
          </select>
          <div className="glass-card flex overflow-hidden p-1">
            <button onClick={() => setView("grid")} className={`rounded-lg px-2 py-1 text-xs ${view === "grid" ? "bg-white/10 text-white" : "text-slate-500"}`} aria-label="Grid view">▦</button>
            <button onClick={() => setView("list")} className={`rounded-lg px-2 py-1 text-xs ${view === "list" ? "bg-white/10 text-white" : "text-slate-500"}`} aria-label="List view">☰</button>
          </div>
        </div>
      </div>

      {loading && <p className="text-white/80">Loading…</p>}

      <div className={view === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
        {!loading && sortedApps.length === 0 && (
          <div className="glass-card col-span-full flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 text-4xl">⌘</div>
            <h2 className="text-lg font-semibold text-white">{search ? "No matching apps" : "Your workspace is empty"}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {search ? "Try another name or tag." : "Create your first app with Appo's AI Builder and it will appear here."}
            </p>
            {!search && <Link href="/dashboard/generator" className="btn-accent mt-5">Create your first app</Link>}
          </div>
        )}
        {sortedApps.map((app) => (
          <div key={app.id} className={`glass-card space-y-2 p-5 ${view === "list" ? "data-row" : ""}`}>
            <div className="flex items-center justify-between">
              <Link href={`/dashboard/apps/${app.id}`} className="flex items-center gap-3 font-semibold hover:text-violet-200">
                <span className="thumb-tile h-9 w-9 shrink-0 text-xs">{app.name.slice(0, 2).toUpperCase()}</span>
                {app.name}
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublishTemplate(app.id)}
                  className={`text-xs underline ${app.is_public_template ? "text-violet" : "text-slate-500"}`}
                >
                  {app.is_public_template ? "Public template" : "Publish to gallery"}
                </button>
                <button
                  onClick={() => toggleFavorite(app.id)}
                  aria-label={app.is_favorite ? "Remove from favorites" : "Add to favorites"}
                  className={`text-lg transition ${app.is_favorite ? "text-amber-400" : "text-slate-500 hover:text-amber-300"}`}
                >
                  {app.is_favorite ? "★" : "☆"}
                </button>
              </div>
            </div>
            <Link href={`/dashboard/apps/${app.id}`} className="block text-xs text-slate-400 hover:text-slate-200">v{app.version} · build #{app.build_number}{app.folder ? ` · ${app.folder}` : ""}</Link>
            <div className="flex flex-wrap gap-1">
              {app.tags?.map((tag) => (
                <span key={tag} className="rounded-full bg-violet/10 px-2 py-0.5 text-xs text-violet">
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => cloneApp(app.id)} className="btn-accent flex-1 text-sm">
                Clone
              </button>
              <button onClick={() => shareApp(app.id)} className="btn-outline flex-1 text-sm">
                {copiedId === app.id ? "Link copied!" : "Share"}
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleHistory(app.id)} className="flex-1 text-xs text-slate-400 underline">
                {historyOpenFor === app.id ? "Hide history" : "Version history"}
              </button>
              <button
                onClick={() => setGithubPromptFor(githubPromptFor === app.id ? null : app.id)}
                className="flex-1 text-xs text-slate-400 underline"
              >
                Push to GitHub
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => deployWeb(app.id)} disabled={deployingId === app.id} className="btn-accent flex-1 text-xs disabled:opacity-50">{deployingId === app.id ? "Publishing…" : "Deploy web"}</button>
              <Link href="/dashboard/deployments" className="btn-outline flex-1 text-center text-xs">Releases</Link>
            </div>
            {deployMessage[app.id] && <p className="text-xs text-slate-400">{deployMessage[app.id]}</p>}
            <div className="flex gap-2">
              <button onClick={() => requestBuild(app.id, "ios")} className="flex-1 text-xs text-slate-400 underline">
                Build for App Store
              </button>
              <button onClick={() => requestBuild(app.id, "android")} className="flex-1 text-xs text-slate-400 underline">
                Build for Play Store
              </button>
            </div>

            {historyOpenFor === app.id && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                {historyError && <p className="text-fuchsia-300">{historyError}</p>}
                {!historyError && versions.length === 0 && <p className="text-slate-400">No prior versions yet.</p>}
                {versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between border-b border-white/5 py-2 last:border-0">
                    <div>
                      <p className="text-slate-200">v{v.version_number} — {v.change_summary ?? "No summary"}</p>
                      <p className="text-slate-500">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => restoreVersion(app.id, v.id)} className="text-violet-300 underline">
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            {githubPromptFor === app.id && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs space-y-2">
                <p className="text-slate-400">
                  Paste a{" "}
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline"
                  >
                    GitHub personal access token
                  </a>{" "}
                  with repo-creation access. Used once for this push, never stored.
                </p>
                <input
                  value={githubToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGithubToken(e.target.value)}
                  placeholder="ghp_…"
                  type="password"
                  className="input text-xs"
                />
                <button onClick={() => pushToGithub(app.id)} className="btn-accent w-full text-xs">
                  Push
                </button>
                {githubStatus && <p className="text-slate-400">{githubStatus}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {!loading && apps.length === 0 && (
        <p className="text-white/80">No apps yet — head to the AI Generator to create your first one.</p>
      )}
    </div>
  );
}
