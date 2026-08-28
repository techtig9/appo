"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/get-started", label: "Get started", icon: "spark" },
  { href: "/dashboard/apps", label: "My apps", icon: "app" },
  { href: "/dashboard/generator", label: "AI Builder", icon: "spark" },
  { href: "/dashboard/templates", label: "Templates", icon: "layers" },
  { href: "/dashboard/deployments", label: "Deployments", icon: "rocket" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
  { href: "/dashboard/activity", label: "Activity", icon: "activity" },
  { href: "/dashboard/team", label: "Team", icon: "team" },
];

const MANAGE_ITEMS = [
  { href: "/dashboard/billing", label: "Billing", icon: "card" },
  { href: "/dashboard/profile", label: "Profile", icon: "user" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
  if (name === "app") return <svg {...common}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h3"/></svg>;
  if (name === "spark") return <svg {...common}><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>;
  if (name === "layers") return <svg {...common}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>;
  if (name === "team") return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.7M17 15c2 .5 3.4 2 4 4.5"/></svg>;
  if (name === "rocket") return <svg {...common}><path d="M14.5 4.5c2.7-.9 4.9-.9 5.8 0 .9.9.9 3.1 0 5.8l-5.8 5.8-5.1-5.1 5.1-6.5Z"/><path d="m9.4 14.6-2.8 2.8M7 12l-3 1 1 3 3-1M12 7.5 16.5 12"/><circle cx="16.7" cy="7.3" r="1"/></svg>;
  if (name === "chart") return <svg {...common}><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>;
  if (name === "activity") return <svg {...common}><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>;
  if (name === "card") return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></svg>;
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.3 3.1-5 7-5s6.3 1.7 7 5"/></svg>;
  return <svg {...common}><path d="M12 3a2 2 0 0 1 2 2v.4a7.6 7.6 0 0 1 2 1.2l.4-.2a2 2 0 1 1 2 3.5l-.4.2c.1.6.2 1.2.2 1.9s-.1 1.3-.2 1.9l.4.2a2 2 0 1 1-2 3.5l-.4-.2a7.6 7.6 0 0 1-2 1.2v.4a2 2 0 1 1-4 0v-.4a7.6 7.6 0 0 1-2-1.2l-.4.2a2 2 0 1 1-2-3.5l.4-.2A7.6 7.6 0 0 1 5.8 12c0-.7.1-1.3.2-1.9l-.4-.2a2 2 0 1 1 2-3.5l.4.2a7.6 7.6 0 0 1 2-1.2V5a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="2.5"/></svg>;
}

function NavLink({ item, close }: { item: typeof NAV_ITEMS[number]; close?: () => void }) {
  const pathname = usePathname();
  const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link href={item.href} onClick={close} className={`group flex items-center gap-3 rounded-full px-3 py-2.5 text-sm transition ${active ? "nav-pill-active text-white" : "text-slate-400 hover:bg-white/[.05] hover:text-white"}`}>
      <span className={active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}><Icon name={item.icon}/></span>
      <span className={active ? "font-medium" : ""}>{item.label}</span>
      {item.href === "/dashboard/generator" && !active && <span className="ml-auto rounded-full bg-violet/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">AI</span>}
    </Link>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-[60] rounded-xl border border-white/10 bg-[#0d0d18]/90 p-2.5 text-slate-200 shadow-xl backdrop-blur-xl lg:hidden" aria-label="Open navigation">
        <span className="block h-0.5 w-5 bg-current"/><span className="mt-1.5 block h-0.5 w-5 bg-current"/><span className="mt-1.5 block h-0.5 w-5 bg-current"/>
      </button>
      {open && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={close} aria-label="Close navigation"/>}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/[.07] bg-[#0a0a12]/95 px-4 py-5 backdrop-blur-2xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" onClick={close} className="flex items-center gap-2.5">
            <img src="/logo-icon.svg" alt="" className="h-8 w-8 rounded-xl" />
            <div><div className="gradient-text text-[15px] font-semibold tracking-tight">appo</div><div className="text-[10px] uppercase tracking-[.18em] text-slate-500">AI app builder</div></div>
          </Link>
          <button onClick={close} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close navigation">×</button>
        </div>

        <div className="mt-8 flex-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">Workspace</p>
          <nav className="space-y-1">{NAV_ITEMS.map((item) => <NavLink key={item.href} item={item} close={close}/>)}</nav>
          <p className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-600">Manage</p>
          <nav className="space-y-1">{MANAGE_ITEMS.map((item) => <NavLink key={item.href} item={item} close={close}/>)}</nav>
        </div>

        <div className="rounded-2xl border border-violet/15 bg-gradient-to-br from-violet/10 to-fuchsia/5 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-violet-100"><span className="h-2 w-2 rounded-full bg-violet shadow-[0_0_12px_rgba(139,92,246,.8)]"/> Build faster with AI</div>
          <p className="mt-2 text-xs leading-5 text-slate-400">Describe a feature and let Appo plan, build and refine it with you.</p>
          <Link href="/dashboard/generator" onClick={close} className="mt-3 inline-flex text-xs font-semibold text-white hover:text-violet-200">Open AI Builder →</Link>
        </div>
      </aside>
    </>
  );
}
