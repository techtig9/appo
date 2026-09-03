import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approximateMonthlyAppCapacity } from "@/lib/credits";
import { getLowCreditWarning } from "@/lib/account-lifecycle";
import { computeOnboardingProgress } from "@/lib/onboarding";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { DashboardPrompt } from "@/components/dashboard/DashboardPrompt";
import { Card, MetricCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import type { PlanId } from "@/lib/supabase/types";

/**
 * Workspace overview.
 *
 * A bug fixed here: the "Recent apps" query selected a `description`
 * column that does not exist on `apps`. PostgREST rejects the whole
 * select, so `apps` came back null and the panel showed its empty state to
 * every user, forever — including users with a dozen projects. Same class
 * of defect as the one that made AI editing return "App not found": the
 * minimal Database type does not type `.select()` strings, so nothing
 * caught either of them.
 */

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: subscription }, { data: profile }, { data: apps }, { count: deploymentCount }, { count: appCount }] =
    await Promise.all([
      supabase.from("subscriptions").select("plan, credits_remaining, credits_granted").eq("user_id", userId).maybeSingle(),
      supabase.from("users").select("name, onboarding_completed").eq("id", userId).maybeSingle(),
      supabase
        .from("apps")
        .select("id, name, folder, platforms, created_at, is_favorite")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      // Counted rather than fetched: the panel only needs the number, and
      // RLS already scopes deployments to this user's apps.
      supabase.from("deployments").select("id", { count: "exact", head: true }),
      supabase.from("apps").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

  const totalApps = appCount ?? 0;
  const warning = subscription ? getLowCreditWarning(subscription.credits_remaining, subscription.credits_granted) : null;
  const onboarding = computeOnboardingProgress(totalApps, (deploymentCount ?? 0) > 0);
  const showOnboarding = !profile?.onboarding_completed && !onboarding.allDone;

  const plan = (subscription?.plan ?? "free") as PlanId;
  const credits = subscription?.credits_remaining ?? 0;
  const granted = subscription?.credits_granted ?? 0;
  const usedPercent = granted > 0 ? Math.min(100, Math.round(((granted - credits) / granted) * 100)) : 0;

  const firstName = (profile?.name ?? (user?.user_metadata?.full_name as string | undefined) ?? "").split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <section>
        <p className="eyebrow">{greeting()}{firstName ? `, ${firstName}` : ""}</p>
        <h1 className="mt-2 text-page font-semibold tracking-tight text-ink">What are you building today?</h1>
        <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-secondary">
          Describe an app in plain language. Appo plans it, builds it, and gives you a workspace to refine it.
        </p>
        <DashboardPrompt className="mt-5" />
      </section>

      {showOnboarding ? <OnboardingChecklist steps={onboarding.steps} /> : null}

      {warning?.show ? (
        <Card variant="status" tone={warning.level === "critical" ? "danger" : "warning"} className="flex flex-wrap items-center gap-3 p-4">
          <p className="min-w-0 flex-1 text-small text-ink">{warning.message}</p>
          <Link href="/dashboard/billing" className="btn btn-secondary btn-sm">
            Manage plan
          </Link>
        </Card>
      ) : null}

      <section aria-label="Workspace summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Plan" value={<span className="capitalize">{plan}</span>} hint="Current subscription" />
        <MetricCard
          label="Credits left"
          value={credits.toLocaleString("en-GB")}
          hint={granted ? `${usedPercent}% of this cycle used` : "No monthly allowance"}
        />
        <MetricCard label="Projects" value={totalApps} hint="In your workspace" />
        <MetricCard
          label="Deployments"
          value={deploymentCount ?? 0}
          hint={`About ${approximateMonthlyAppCapacity(plan)} full builds a month on this plan`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-card font-semibold tracking-tight text-ink">Recent projects</h2>
              <p className="mt-0.5 text-caption text-ink-muted">Pick up where you left off.</p>
            </div>
            {totalApps > 0 ? (
              <Link href="/dashboard/apps" className="text-caption font-medium text-brand underline-offset-4 hover:underline">
                View all
              </Link>
            ) : null}
          </div>

          <div className="mt-4">
            {(apps ?? []).length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Describe an app above, or start from one of the 64 templates in the marketplace."
                action={{ label: "Browse templates", href: "/dashboard/templates" }}
                className="border-0 py-10"
              />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
                {apps!.map((app) => (
                  <li key={app.id}>
                    <Link href={`/dashboard/apps/${app.id}`} className="data-row flex items-center gap-3 px-3.5 py-3">
                      <span className="thumb-tile h-9 w-9 shrink-0" aria-hidden="true">
                        {(app.name ?? "A").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-small font-medium text-ink">{app.name ?? "Untitled project"}</span>
                          {app.is_favorite ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="Favourite" className="shrink-0 text-brand">
                              <path d="M12 4.8 13.9 9l4.6.4-3.5 3 1.1 4.5L12 14.6 7.9 16.9 9 12.4l-3.5-3L10.1 9 12 4.8Z" />
                            </svg>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-caption text-ink-muted">
                          {app.folder ? `${app.folder} · ` : ""}
                          {(app.platforms ?? ["web"]).join(", ")}
                          {app.created_at ? ` · created ${new Date(app.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}` : ""}
                        </span>
                      </span>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-card font-semibold tracking-tight text-ink">Quick actions</h2>
          <p className="mt-0.5 text-caption text-ink-muted">
            Press <kbd className="kbd">⌘</kbd> <kbd className="kbd">K</kbd> for the command palette.
          </p>
          <div className="mt-4 grid gap-1.5">
            <QuickAction href="/dashboard/generator" title="Build with AI" detail="Describe a new application" />
            <QuickAction href="/dashboard/templates" title="Start from a template" detail="64 starting points" />
            <QuickAction href="/dashboard/deployments" title="Deployments" detail="Releases and status" />
            <QuickAction href="/dashboard/billing" title="Usage and billing" detail="Plan, credits and invoices" />
          </div>
        </Card>
      </section>
    </div>
  );
}

/** Server-rendered, so this is the server's clock, not the viewer's. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function QuickAction({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border border-line px-3 py-2.5 transition-colors duration-micro hover:border-line-strong hover:bg-canvas-subtle"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-small font-medium text-ink">{title}</span>
        <span className="block text-caption text-ink-muted">{detail}</span>
      </span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-micro group-hover:translate-x-0.5">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
