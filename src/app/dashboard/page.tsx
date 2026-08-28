import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { approximateMonthlyAppCapacity } from "@/lib/credits";
import { getLowCreditWarning } from "@/lib/account-lifecycle";
import { computeOnboardingProgress } from "@/lib/onboarding";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: subscription }, { data: profile }, { data: apps }, { data: deployments }] = await Promise.all([
    supabase.from("subscriptions").select("plan, credits_remaining, credits_granted").eq("user_id", user?.id ?? "").single(),
    supabase.from("users").select("onboarding_completed").eq("id", user?.id ?? "").single(),
    supabase.from("apps").select("id, name, description").eq("user_id", user?.id ?? "").order("created_at", { ascending: false }).limit(5),
    supabase.from("deployments").select("id").eq("platform", "web"),
  ]);

  const warning = subscription ? getLowCreditWarning(subscription.credits_remaining, subscription.credits_granted) : null;
  const onboarding = computeOnboardingProgress(apps?.length ?? 0, (deployments?.length ?? 0) > 0);
  const showOnboarding = !profile?.onboarding_completed && !onboarding.allDone;
  const plan = subscription?.plan ?? "free";
  const credits = subscription?.credits_remaining ?? 0;
  const granted = subscription?.credits_granted ?? 0;
  const usage = granted > 0 ? Math.min(100, Math.round(((granted - credits) / granted) * 100)) : 0;

  return (
    <div className="fade-in space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet/15 via-[#12101f] to-fuchsia/10 p-6 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet/20 blur-[80px]"/>
        <div className="relative max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3 py-1 text-[11px] font-medium text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-violet"/> AI-powered workspace</div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">What will you build today?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Describe an app in plain language. Appo helps turn the idea into a real project you can preview, refine and ship.</p>
          <Link href="/dashboard/generator" className="btn-accent mt-6 inline-flex items-center gap-2 text-sm">Start building with AI <span>→</span></Link>
        </div>
      </section>

      {showOnboarding && <OnboardingChecklist steps={onboarding.steps} />}
      {warning?.show && <div className={`rounded-2xl border p-4 text-sm ${warning.level === "critical" ? "border-fuchsia-400/30 bg-fuchsia-500/5 text-fuchsia-100" : "border-violet/30 bg-violet-500/5 text-violet-100"}`}>{warning.message} <Link href="/dashboard/billing" className="ml-1 font-semibold underline">Manage plan</Link></div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Current plan" value={plan} detail="Your active subscription" />
        <Metric title="AI credits" value={credits.toLocaleString()} detail={granted ? `${usage}% used this cycle` : "No monthly allocation"} progress={granted ? usage : undefined} />
        <Metric title="Apps" value={String(apps?.length ?? 0)} detail="Projects in your workspace" />
        <Metric title="Build capacity" value={`~${subscription ? approximateMonthlyAppCapacity(plan as "free" | "starter" | "pro" | "business") : 0}`} detail="Estimated full apps / cycle" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Recent apps</h2><p className="mt-1 text-xs text-slate-500">Continue where you left off.</p></div><Link href="/dashboard/apps" className="text-xs font-medium text-violet-200 hover:text-white">View all →</Link></div>
          <div className="mt-5 space-y-2">
            {(apps ?? []).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-violet/10 text-violet">✦</div><p className="mt-3 text-sm font-medium">Your first app starts here</p><p className="mt-1 text-xs text-slate-500">Use the AI Builder to turn an idea into a project.</p><Link href="/dashboard/generator" className="btn-accent mt-4 inline-flex text-xs">Create an app</Link></div> : apps?.map((app: { id: string; name: string | null; description: string | null }) => <Link key={app.id} href={`/dashboard/apps`} className="data-row flex items-center gap-3 rounded-2xl border border-transparent bg-white/[.025] p-3 transition hover:border-white/10 hover:bg-white/[.05]"><span className="thumb-tile h-10 w-10 shrink-0">{(app.name ?? "A").slice(0,1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{app.name ?? "Untitled app"}</p><p className="truncate text-xs text-slate-500">{app.description ?? "No description"}</p></div><span className="text-xs text-slate-600">Open →</span></Link>)}</div>
        </div>
        <div className="glass-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Quick actions</h2><p className="mt-1 text-xs text-slate-500">Jump straight into your workflow.</p>
          <div className="mt-5 grid gap-2">
            <QuickAction href="/dashboard/generator" icon="✦" title="Build with AI" detail="Describe a new application" />
            <QuickAction href="/dashboard/templates" icon="◇" title="Start from a template" detail="Use a proven starting point" />
            <QuickAction href="/dashboard/apps" icon="□" title="Manage your apps" detail="Versions, sharing and exports" />
            <QuickAction href="/dashboard/billing" icon="↗" title="View usage & billing" detail="Plan, credits and invoices" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, detail, progress }: { title: string; value: string; detail: string; progress?: number }) {
  return <div className="glass-card p-5"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold capitalize tracking-tight text-white">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p>{progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet to-fuchsia" style={{ width: `${progress}%` }}/></div>}</div>;
}

function QuickAction({ href, icon, title, detail }: { href: string; icon: string; title: string; detail: string }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[.02] p-3 transition hover:border-violet/20 hover:bg-violet/5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet/10 text-violet-200">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-slate-200 group-hover:text-white">{title}</span><span className="block text-[11px] text-slate-500">{detail}</span></span><span className="text-slate-600 group-hover:text-violet-200">→</span></Link>;
}
