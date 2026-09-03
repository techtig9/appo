import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeOnboardingProgress } from "@/lib/onboarding";

export default async function GetStartedPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: apps }, { data: deployments }, { data: profile }] = await Promise.all([
    supabase.from("apps").select("id").eq("user_id", user?.id ?? ""),
    supabase.from("deployments").select("id").eq("platform", "web"),
    supabase.from("users").select("onboarding_completed").eq("id", user?.id ?? "").single(),
  ]);

  const progress = computeOnboardingProgress(apps?.length ?? 0, (deployments?.length ?? 0) > 0);
  const completed = progress.steps.filter((s) => s.done).length;
  const percent = Math.round((completed / progress.steps.length) * 100);

  const actions = [
    { id: "describe", title: "Describe your app idea", text: "Tell Appo what you want to build in plain language.", href: "/dashboard/generator", cta: "Open AI Builder", done: progress.steps[0].done },
    { id: "generate", title: "Generate your first app", text: "Let the AI Prompt Engineer turn your idea into a structured project.", href: "/dashboard/generator", cta: "Generate an app", done: progress.steps[1].done },
    { id: "export", title: "Ship your app", text: "Preview, export to GitHub, or deploy your first web release.", href: "/dashboard/apps", cta: "View my apps", done: progress.steps[2].done },
  ];

  return (
    <div className="fade-in space-y-7">
      <section className="card card-featured relative overflow-hidden p-6 sm:p-9">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-border bg-brand-subtle px-3 py-1 text-[11px] font-medium text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Appo Launch Guide
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Go from idea to shipped app.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-secondary">
            Follow the short path below to experience Appo&apos;s core workflow. You can leave this guide at any time and return when you&apos;re ready.
          </p>
          <div className="mt-7 max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">Launch progress</span>
              <span className="text-ink-muted">{completed}/{progress.steps.length} complete · {percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas-subtle">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </section>

      {progress.allDone ? (
        <section className="rounded-3xl border border-success/35 bg-success-subtle p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-success-subtle text-success">✓</div>
            <div>
              <h2 className="text-base font-semibold text-ink">You&apos;re ready to build at full speed.</h2>
              <p className="mt-1 text-sm text-ink-secondary">Your first app has been generated and shipped. Create another project whenever inspiration strikes.</p>
              <Link href="/dashboard/generator" className="btn btn-primary btn-sm mt-4">Build another app →</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {actions.map((action, index) => (
            <div key={action.id} className={`rounded-2xl border p-5 transition ${action.done ? "border-success/35 bg-success-subtle" : "border-line bg-canvas-subtle"}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${action.done ? "bg-success-subtle text-success" : "bg-brand-subtle text-brand"}`}>
                  {action.done ? "✓" : index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-sm font-semibold ${action.done ? "text-ink-secondary" : "text-ink"}`}>{action.title}</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-ink-muted">{action.text}</p>
                  {!action.done && <Link href={action.href} className="mt-4 inline-flex rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-ink transition hover:bg-brand">{action.cta} →</Link>}
                </div>
                {action.done && <span className="text-[11px] font-medium text-success">Complete</span>}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <GuideCard title="Start from a template" text="Skip the blank page with a proven app structure." href="/dashboard/templates" />
        <GuideCard title="Explore your workspace" text="Manage versions, exports, deployments and collaborators." href="/dashboard/apps" />
        <GuideCard title="Check your plan" text="Review credits, usage and subscription options." href="/dashboard/billing" />
      </section>

      {profile?.onboarding_completed && !progress.allDone && (
        <p className="text-center text-[11px] text-ink-muted">Your setup guide was previously dismissed. You can still complete it here.</p>
      )}
    </div>
  );
}

function GuideCard({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-line bg-canvas-subtle p-5 transition hover:border-brand-border hover:bg-brand-subtle">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-ink-muted">{text}</p>
      <span className="mt-4 inline-block text-xs font-medium text-brand">Open →</span>
    </Link>
  );
}
