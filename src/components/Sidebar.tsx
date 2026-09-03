"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

/**
 * Dashboard navigation.
 *
 * Grouped into the three sections the brief specifies (workspace product
 * surfaces, then Workspace, then Account) rather than one undifferentiated
 * list, and collapsible on desktop — an IDE-style builder needs the
 * horizontal room back.
 *
 * The collapsed preference is per-viewer convenience, so localStorage is
 * the right home for it; every read and write is guarded because that API
 * throws outright in a browser configured to block site data.
 */

const COLLAPSE_KEY = "appo-sidebar-collapsed";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
}

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "grid" },
  { href: "/dashboard/apps", label: "Projects", icon: "app" },
  { href: "/dashboard/templates", label: "Templates", icon: "layers" },
  { href: "/dashboard/generator", label: "AI Builder", icon: "spark", badge: "AI" },
  { href: "/dashboard/deployments", label: "Deployments", icon: "rocket" },
  { href: "/dashboard/analytics", label: "Analytics", icon: "chart" },
];

const WORKSPACE: NavItem[] = [
  { href: "/dashboard/team", label: "Team", icon: "team" },
  { href: "/dashboard/activity", label: "Activity", icon: "activity" },
];

const ACCOUNT: NavItem[] = [
  { href: "/dashboard/billing", label: "Billing", icon: "card" },
  { href: "/dashboard/profile", label: "Profile", icon: "user" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // Storage unavailable — the default (expanded) is fine.
    }
  }, []);

  // Route changes must close the mobile drawer, or tapping a link leaves
  // the overlay covering the page the user just navigated to.
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Preference just will not persist across reloads.
      }
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        className="fixed left-3 top-2.5 z-header rounded-md border border-line bg-surface p-2 text-ink-secondary transition-colors duration-micro hover:text-ink lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-overlay animate-fade-in bg-[var(--app-scrim)] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-sidebar flex flex-col border-r border-line bg-surface transition-[transform,width] duration-fast ease-out",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "w-[248px] lg:w-[68px]" : "w-[248px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={cn("flex h-14 items-center gap-2.5 border-b border-line px-4", collapsed && "lg:justify-center lg:px-0")}>
          <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.svg" alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0 rounded-md" />
            <span className={cn("text-body font-semibold tracking-tight text-ink", collapsed && "lg:hidden")}>Appo</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1.5 text-ink-muted hover:text-ink lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          <NavGroup items={PRIMARY} collapsed={collapsed} />
          <NavGroup label="Workspace" items={WORKSPACE} collapsed={collapsed} />
          <NavGroup label="Account" items={ACCOUNT} collapsed={collapsed} />
        </nav>

        <div className="border-t border-line p-2.5">
          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-small text-ink-secondary transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink",
              collapsed && "lg:justify-center lg:px-0"
            )}
            title="Help & docs"
          >
            <Icon name="help" />
            <span className={cn(collapsed && "lg:hidden")}>Help &amp; docs</span>
          </Link>

          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "mt-1 hidden w-full items-center gap-3 rounded-md px-3 py-2 text-small text-ink-muted transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink lg:flex",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={cn("shrink-0 transition-transform duration-fast", collapsed && "rotate-180")}
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            <span className={cn(collapsed && "lg:hidden")}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function NavGroup({ label, items, collapsed }: { label?: string; items: NavItem[]; collapsed: boolean }) {
  return (
    <div className={label ? "mt-6" : undefined}>
      {label ? (
        <p className={cn("px-3 pb-1.5 text-caption font-semibold uppercase tracking-wider text-ink-muted", collapsed && "lg:hidden")}>
          {label}
        </p>
      ) : null}
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} collapsed={collapsed} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  // Exact match for the index route, prefix match for everything else —
  // otherwise "/dashboard" stays highlighted on every child page.
  const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-small transition-colors duration-micro",
        active ? "bg-brand-subtle font-medium text-brand" : "text-ink-secondary hover:bg-canvas-subtle hover:text-ink",
        collapsed && "lg:justify-center lg:px-0"
      )}
    >
      {active ? <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand" aria-hidden="true" /> : null}
      <Icon name={item.icon} />
      <span className={cn("truncate", collapsed && "lg:hidden")}>{item.label}</span>
      {item.badge && !active ? (
        <span className={cn("ml-auto rounded-full bg-ai/15 px-1.5 py-px text-[10px] font-semibold text-ai", collapsed && "lg:hidden")}>
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

type IconName =
  | "grid"
  | "app"
  | "spark"
  | "layers"
  | "team"
  | "rocket"
  | "chart"
  | "activity"
  | "card"
  | "user"
  | "settings"
  | "help";

function Icon({ name }: { name: IconName }) {
  const props = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "shrink-0",
  };

  switch (name) {
    case "grid":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "app":
      return (
        <svg {...props}>
          <rect x="5" y="3" width="14" height="18" rx="2.5" />
          <path d="M9 7h6M9 11h6M9 15h3" />
        </svg>
      );
    case "spark":
      return (
        <svg {...props}>
          <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />
          <path d="m19 16 .6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2Z" />
        </svg>
      );
    case "layers":
      return (
        <svg {...props}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 12 9 5 9-5M3 16.5l9 5 9-5" />
        </svg>
      );
    case "team":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5" />
          <path d="M16 5.5a3 3 0 0 1 0 5.7M17 15c2 .5 3.4 2 4 4.5" />
        </svg>
      );
    case "rocket":
      return (
        <svg {...props}>
          <path d="M14.5 4.5c2.7-.9 4.9-.9 5.8 0 .9.9.9 3.1 0 5.8l-5.8 5.8-5.1-5.1 5.1-6.5Z" />
          <path d="m9.4 14.6-2.8 2.8M7 12l-3 1 1 3 3-1" />
          <circle cx="16.7" cy="7.3" r="1" />
        </svg>
      );
    case "chart":
      return (
        <svg {...props}>
          <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
        </svg>
      );
    case "activity":
      return (
        <svg {...props}>
          <path d="M3 12h4l2-6 4 12 2-6h6" />
        </svg>
      );
    case "card":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3 10h18M7 15h4" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.7-3.3 3.1-5 7-5s6.3 1.7 7 5" />
        </svg>
      );
    case "help":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.6 2.6 0 1 1 3.4 2.5c-.6.2-.9.7-.9 1.3v.4M12 17h.01" />
        </svg>
      );
    case "settings":
    default:
      return (
        <svg {...props}>
          <path d="M12 3a2 2 0 0 1 2 2v.4a7.6 7.6 0 0 1 2 1.2l.4-.2a2 2 0 1 1 2 3.5l-.4.2c.1.6.2 1.2.2 1.9s-.1 1.3-.2 1.9l.4.2a2 2 0 1 1-2 3.5l-.4-.2a7.6 7.6 0 0 1-2 1.2v.4a2 2 0 1 1-4 0v-.4a7.6 7.6 0 0 1-2-1.2l-.4.2a2 2 0 1 1-2-3.5l.4-.2A7.6 7.6 0 0 1 5.8 12c0-.7.1-1.3.2-1.9l-.4-.2a2 2 0 1 1 2-3.5l.4.2a7.6 7.6 0 0 1 2-1.2V5a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
  }
}
