"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface AppItem { id: string; name: string }
interface Member { id: string; user_id: string; role: string; users?: { name: string | null; email: string } | null }
interface Invite { id: string; email: string; role: string; expires_at: string }

export default function TeamPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [sharedApps, setSharedApps] = useState<(AppItem & { role: string })[]>([]);
  const [appId, setAppId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  async function loadApps() {
    const [r, sr] = await Promise.all([fetch("/api/apps"), fetch("/api/team/apps")]);
    const d = await r.json(); const sd = await sr.json();
    const list = (d.apps ?? []).map((a: AppItem) => ({ id: a.id, name: a.name }));
    const shared = sd.apps ?? [];
    setApps(list); setSharedApps(shared); if (!appId && list[0]) setAppId(list[0].id); else if (!appId && shared[0]) setAppId(shared[0].id);
  }
  async function loadTeam(id: string) {
    if (!id) return; setLoading(true); const r = await fetch(`/api/apps/${id}/collaborators`); const d = await r.json();
    setMembers(d.collaborators ?? []); setInvites(d.invitations ?? []); if (!r.ok) setStatus(d.error ?? "Couldn't load team."); else setStatus(""); setLoading(false);
  }
  useEffect(() => { loadApps().finally(() => setLoading(false)); }, []);
  useEffect(() => { if (appId) loadTeam(appId); }, [appId]);
  useEffect(() => {
    const token = searchParams.get("invite");
    if (!token) return;
    fetch("/api/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async r => ({ ok: r.ok, data: await r.json() }))
      .then(({ ok, data }) => { setStatus(ok ? `Joined ${data.app?.name ?? "the app"}.` : (data.error ?? "Invitation could not be accepted.")); if (ok) window.history.replaceState({}, "", "/dashboard/team"); })
      .catch(() => setStatus("Invitation could not be accepted."));
  }, [searchParams]);

  async function invite() {
    setStatus("Creating invitation…");
    const r = await fetch(`/api/apps/${appId}/collaborators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) });
    const d = await r.json();
    if (!r.ok) return setStatus(d.error ?? "Couldn't create invitation.");
    await navigator.clipboard?.writeText(d.inviteUrl).catch(() => {}); setEmail(""); setStatus("Invitation link copied. Send it to your teammate."); loadTeam(appId);
  }
  async function remove(id: string) {
    if (!confirm("Remove this collaborator?")) return;
    const r = await fetch(`/api/apps/${appId}/collaborators/${id}`, { method: "DELETE" }); if (r.ok) loadTeam(appId); else { const d = await r.json(); setStatus(d.error ?? "Couldn't remove collaborator."); }
  }

  return <div className="fade-in space-y-6">
    <div><p className="text-sm font-medium text-brand">Workspace collaboration</p><h1 className="mt-1 text-3xl font-semibold text-ink">Build together</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">Invite teammates to review or edit an Appo project. Invitations expire after 7 days and are tied to the recipient's email.</p></div>
    {sharedApps.length > 0 && <div className="glass-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">Shared with me</h2><p className="mt-1 text-xs text-ink-muted">Projects where another Appo user has invited you.</p></div><span className="text-xs text-brand">{sharedApps.length} shared</span></div><div className="mt-4 flex flex-wrap gap-2">{sharedApps.map(a => <button key={a.id} onClick={() => setAppId(a.id)} className={`rounded-xl border px-3 py-2 text-left text-sm ${appId === a.id ? "border-brand-border bg-brand-subtle text-ink" : "border-line bg-canvas-subtle text-ink-secondary"}`}>{a.name}<span className="ml-2 text-[10px] uppercase text-ink-muted">{a.role}</span></button>)}</div></div>}
    <div className="glass-card p-5">
      <label className="text-xs uppercase tracking-[.16em] text-ink-muted">Project</label>
      <select value={appId} onChange={e => setAppId(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-canvas-subtle px-3 py-3 text-sm text-ink md:max-w-xl"><option value="">Select an app</option>{apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
    </div>
    {apps.some(a => a.id === appId) ? <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <div className="glass-card p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-ink">People with access</h2><p className="mt-1 text-xs text-ink-muted">Editors can work on the project; viewers can review it.</p></div><span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs text-brand">{members.length} members</span></div>
        <div className="mt-5 space-y-2">{loading ? <p className="text-sm text-ink-muted">Loading…</p> : members.length === 0 ? <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-muted">You're the only member. Invite someone to start collaborating.</div> : members.map(m => <div key={m.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas-subtle p-3"><div><p className="text-sm text-ink">{m.users?.name || m.users?.email || "Collaborator"}</p><p className="text-xs text-ink-muted">{m.users?.email}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-canvas-subtle px-2 py-1 text-[11px] text-ink-secondary">{m.role}</span><button onClick={() => remove(m.id)} className="text-xs text-ink-muted hover:text-red-300">Remove</button></div></div>)}</div>
      </div>
      <div className="glass-card p-5"><h2 className="font-semibold text-ink">Invite a teammate</h2><p className="mt-1 text-xs leading-5 text-ink-muted">A secure one-time link is generated for the exact email address.</p><input value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" className="mt-4 w-full rounded-xl border border-line bg-canvas-subtle px-3 py-3 text-sm text-ink outline-none placeholder:text-ink-muted"/><div className="mt-3 flex gap-2"><select value={role} onChange={e => setRole(e.target.value as "viewer" | "editor")} className="flex-1 rounded-xl border border-line bg-canvas-subtle px-3 py-3 text-sm text-ink"><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button disabled={!appId || !email} onClick={invite} className="btn-accent px-5 disabled:cursor-not-allowed disabled:opacity-40">Invite</button></div>{status && <p className="mt-3 text-xs text-ink-secondary">{status}</p>}</div>
    </div> : <div className="glass-card p-6"><h2 className="font-semibold text-ink">Shared project access</h2><p className="mt-2 text-sm leading-6 text-ink-secondary">You have access to this project as a collaborator. The owner manages invitations and project membership; your role is shown above.</p></div>}
    {invites.length > 0 && <div className="glass-card p-5"><h2 className="font-semibold text-ink">Pending invitations</h2><div className="mt-3 space-y-2">{invites.map(i => <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"><div><p className="text-sm text-ink">{i.email}</p><p className="text-xs text-ink-muted">{i.role} · expires {new Date(i.expires_at).toLocaleDateString()}</p></div><span className="text-xs text-warning">Pending</span></div>)}</div></div>}
  </div>;
}
