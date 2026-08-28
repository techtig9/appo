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
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet/15 via-[#12101f] to-fuchsia/10 p-6 sm:p-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet/20 blur-[90px]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3 py-1 text-[11px] font-medium text-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet" /> Appo Launch Guide
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Go from idea to shipped app.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Follow the short path below to experience Appo's core workflow. You can leave this guide at any time and return when you're ready.
          </p>
          <div className="mt-7 max-w-xl">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Launch progress</span>
              <span className="text-slate-500">{completed}/{progress.steps.length} complete · {percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-violet to-fuchsia transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      </section>

      {progress.allDone ? (
        <section className="rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">✓</div>
            <div>
              <h2 className="text-base font-semibold text-white">You're ready to build at full speed.</h2>
              <p className="mt-1 text-sm text-slate-400">Your first app has been generated and shipped. Create another project whenever inspiration strikes.</p>
              <Link href="/dashboard/generator" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950">Build another app →</Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {actions.map((action, index) => (
            <div key={action.id} className={`rounded-2xl border p-5 transition ${action.done ? "border-emerald-400/15 bg-emerald-500/[.035]" : "border-white/10 bg-white/[.025]"}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${action.done ? "bg-emerald-500/15 text-emerald-300" : "bg-violet/10 text-violet-200"}`}>
                  {action.done ? "✓" : index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className={`text-sm font-semibold ${action.done ? "text-slate-400" : "text-white"}`}>{action.title}</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{action.text}</p>
                  {!action.done && <Link href={action.href} className="mt-4 inline-flex rounded-lg bg-violet px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet/90">{action.cta} →</Link>}
                </div>
                {action.done && <span className="text-[11px] font-medium text-emerald-300">Complete</span>}
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
        <p className="text-center text-[11px] text-slate-600">Your setup guide was previously dismissed. You can still complete it here.</p>
      )}
    </div>
  );
}

function GuideCard({ title, text, href }: { title: string; text: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-violet/20 hover:bg-violet/5">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-500">{text}</p>
      <span className="mt-4 inline-block text-xs font-medium text-violet-200">Open →</span>
    </Link>
  );
}
