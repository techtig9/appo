"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/get-started": "Get started",
  "/dashboard/apps": "My apps",
  "/dashboard/generator": "AI Builder",
  "/dashboard/templates": "Templates",
  "/dashboard/billing": "Billing",
  "/dashboard/activity": "Activity",
  "/dashboard/deployments": "Deployments",
  "/dashboard/analytics": "Analytics",
  "/dashboard/team": "Team",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

export function TopNav() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Workspace";
  return (
    <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#0b0b14]/75 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center gap-4">
        <div className="pl-12 lg:pl-0"><p className="text-sm font-semibold text-white">{title}</p><p className="hidden text-[11px] text-slate-500 sm:block">Build, refine and ship with Appo</p></div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center rounded-full border border-white/10 bg-white/[.035] px-4 py-2 md:flex md:w-64"><span className="mr-2 text-slate-500">⌕</span><input aria-label="Search" placeholder="Search projects…" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-600"/></div>
          <Link href="/dashboard/generator" className="btn-accent hidden py-2 text-xs sm:block">+ New app</Link>
          <Link href="/dashboard/activity" aria-label="Activity" className="relative rounded-full border border-white/10 bg-white/[.035] p-2.5 text-slate-400 hover:text-white"><span>◔</span><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-fuchsia"/></Link>
          <Link href="/dashboard/profile" aria-label="Profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet to-fuchsia text-xs font-bold text-white shadow-lg">A</Link>
        </div>
      </div>
    </header>
  );
}
