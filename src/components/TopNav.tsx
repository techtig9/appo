"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Application header.
 *
 * Three things here were previously decorative and are now real:
 *   - the search field had no handler at all and did nothing;
 *   - the notification bell was a static "◔" glyph with a permanently lit
 *     dot, so it always claimed there was something unread;
 *   - the avatar was a hardcoded letter "A" for every account.
 */

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/get-started": "Get started",
  "/dashboard/apps": "Projects",
  "/dashboard/generator": "AI Builder",
  "/dashboard/templates": "Templates",
  "/dashboard/billing": "Billing",
  "/dashboard/activity": "Activity",
  "/dashboard/notifications": "Notifications",
  "/dashboard/deployments": "Deployments",
  "/dashboard/analytics": "Analytics",
  "/dashboard/team": "Team",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

export interface TopNavUser {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function TopNav({ user }: { user?: TopNavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = TITLES[pathname] ?? (pathname.startsWith("/dashboard/apps/") ? "Project" : "Workspace");

  // Real unread count. A silent failure leaves the badge at zero rather
  // than showing a number the product cannot stand behind.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?unread=true&limit=1")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) setUnread(Number(payload.unread) || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <header className="sticky top-0 z-header border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 pl-14 sm:px-6 lg:pl-6">
        <h1 className="shrink-0 text-body font-semibold tracking-tight text-ink">{title}</h1>

        <form onSubmit={submitSearch} role="search" className="ml-auto hidden min-w-0 max-w-xs flex-1 md:block">
          <label htmlFor="workspace-search" className="sr-only">
            Search projects and templates
          </label>
          <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-canvas-subtle px-3 transition-colors duration-micro focus-within:border-brand">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.6-3.6" />
            </svg>
            <input
              id="workspace-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-muted"
            />
            <kbd className="kbd hidden lg:inline-flex">⌘K</kbd>
          </div>
        </form>

        <div className={cn("flex items-center gap-1.5", "ml-auto md:ml-0")}>
          <Link
            href="/dashboard/generator"
            className="hidden h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-small font-medium text-brand-contrast transition-colors duration-micro hover:bg-brand-hover sm:inline-flex"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New app
          </Link>

          <ThemeToggle />

          <Link
            href="/dashboard/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" />
              <path d="M13.7 19a2 2 0 0 1-3.4 0" />
            </svg>
            {/* Only rendered when there is genuinely something unread. */}
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-none text-brand-contrast">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas-subtle text-caption font-semibold text-ink transition-colors duration-micro hover:border-line-strong"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                initials(user?.name, user?.email)
              )}
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-11 w-56 animate-scale-in overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
              >
                <div className="border-b border-line px-3.5 py-3">
                  <p className="truncate text-small font-medium text-ink">{user?.name ?? "Your account"}</p>
                  <p className="truncate text-caption text-ink-muted">{user?.email ?? ""}</p>
                </div>
                <div className="p-1.5">
                  <MenuLink href="/dashboard/profile">Profile</MenuLink>
                  <MenuLink href="/dashboard/settings">Settings</MenuLink>
                  <MenuLink href="/dashboard/billing">Billing</MenuLink>
                  <MenuLink href="/help">Help &amp; docs</MenuLink>
                </div>
                <div className="border-t border-line p-1.5">
                  {/* A real POST to a server route, so the httpOnly session
                      cookie is cleared rather than only the client store. */}
                  <form action="/api/auth/signout" method="post">
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full rounded-md px-2.5 py-2 text-left text-small text-ink-secondary transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="block rounded-md px-2.5 py-2 text-small text-ink-secondary transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink"
    >
      {children}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, resolved, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : theme === "light" ? "system" : "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      // The label names both the current state and what pressing it does —
      // an icon-only toggle is otherwise a guess for screen reader users.
      aria-label={`Theme: ${theme}. Switch to ${next}.`}
      title={`Theme: ${theme} — switch to ${next}`}
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-secondary transition-colors duration-micro hover:bg-canvas-subtle hover:text-ink"
    >
      {resolved === "dark" ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5Z" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}

/** Initials from a name, falling back to the email's first character. */
export function initials(name?: string | null, email?: string | null): string {
  const source = name?.trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.trim()[0] ?? "?").toUpperCase();
}
