/**
 * Static workspace destinations that search and the command palette can
 * find, so typing "billing" or "invite" lands on the right page instead of
 * returning nothing.
 *
 * In lib rather than in the route because a Next.js `route.ts` may only
 * export HTTP handlers — and because both the search API and the command
 * palette need the same list.
 */

export interface SearchHit {
  type: "project" | "template" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface WorkspacePage {
  title: string;
  keywords: string[];
  href: string;
  subtitle: string;
}

export const WORKSPACE_PAGES: WorkspacePage[] = [
  { title: "Overview", keywords: ["home", "dashboard", "overview"], href: "/dashboard", subtitle: "Dashboard" },
  { title: "AI Builder", keywords: ["build", "generate", "new app", "ai", "create"], href: "/dashboard/generator", subtitle: "Create a new app" },
  { title: "Templates", keywords: ["template", "marketplace", "starter"], href: "/dashboard/templates", subtitle: "Browse the marketplace" },
  { title: "My apps", keywords: ["projects", "apps"], href: "/dashboard/apps", subtitle: "All your projects" },
  { title: "Deployments", keywords: ["deploy", "release", "live", "ship"], href: "/dashboard/deployments", subtitle: "Releases and status" },
  { title: "Analytics", keywords: ["analytics", "usage", "stats", "metrics"], href: "/dashboard/analytics", subtitle: "Usage and activity" },
  { title: "Activity", keywords: ["activity", "history", "log"], href: "/dashboard/activity", subtitle: "Recent workspace activity" },
  { title: "Notifications", keywords: ["notifications", "alerts", "inbox"], href: "/dashboard/notifications", subtitle: "Everything that happened" },
  { title: "Billing", keywords: ["billing", "plan", "subscription", "invoice", "credits", "upgrade", "payment"], href: "/dashboard/billing", subtitle: "Plan and credits" },
  { title: "Team", keywords: ["team", "collaborators", "invite", "share", "members"], href: "/dashboard/team", subtitle: "Collaboration" },
  { title: "Settings", keywords: ["settings", "account", "security", "password", "delete", "theme"], href: "/dashboard/settings", subtitle: "Account and security" },
  { title: "Profile", keywords: ["profile", "name", "avatar"], href: "/dashboard/profile", subtitle: "Your details" },
  { title: "Help", keywords: ["help", "docs", "support", "guide", "faq"], href: "/help", subtitle: "Guides and troubleshooting" },
];

export function matchPages(term: string, limit = 4): SearchHit[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];

  return WORKSPACE_PAGES.filter(
    (page) =>
      page.title.toLowerCase().includes(needle) ||
      page.keywords.some((keyword) => keyword.includes(needle) || needle.includes(keyword))
  )
    .slice(0, limit)
    .map((page) => ({
      type: "page" as const,
      id: page.href,
      title: page.title,
      subtitle: page.subtitle,
      href: page.href,
    }));
}
