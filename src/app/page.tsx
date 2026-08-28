import Link from "next/link";
import { PricingTable } from "@/components/PricingTable";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatbotWidget } from "@/components/ChatbotWidget";

const features = [
  ["✦", "Describe your idea", "Start with plain language. Appo turns your product idea into an actionable app plan."],
  ["◫", "Real app generation", "Generate a runnable React Native / Expo project instead of a static design mockup."],
  ["⌘", "AI-powered refinement", "Keep talking to your project and ask Appo to add, change or improve features."],
  ["◌", "Live preview", "See your generated app running while you build, including a phone-friendly workflow."],
  ["</>", "Full code access", "Inspect and edit the generated project with the built-in code editor, then export it."],
  ["↗", "Ship when ready", "Move from idea to a shareable, deployment-ready project without rebuilding everything from scratch."],
];

const examples = ["A modern habit tracker with streaks and reminders", "A marketplace for local handmade products", "A booking app for a fitness studio", "A personal finance dashboard with budgets"];

export default function LandingPage() {
  return (
    <main className="overflow-hidden text-white">
      <header className="sticky top-0 z-50 border-b border-white/[.06] bg-[#08080f]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5"><img src="/logo-icon.svg" alt="" className="h-8 w-8 rounded-xl"/><span className="text-lg font-semibold tracking-tight">appo</span></Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex"><a href="#features" className="hover:text-white">Features</a><a href="#workflow" className="hover:text-white">How it works</a><a href="#pricing" className="hover:text-white">Pricing</a><a href="#faq" className="hover:text-white">FAQ</a></nav>
          <div className="flex items-center gap-2"><Link href="/login" className="hidden rounded-full px-3.5 py-2 text-sm text-slate-300 hover:text-white sm:block">Log in</Link><Link href="/signup" className="btn-accent px-4 py-2.5 text-sm">Start building</Link></div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pb-28">
        <div className="absolute left-1/2 top-0 -z-10 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet/15 blur-[140px]"/>
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3.5 py-1.5 text-xs font-medium text-violet-200"><span className="h-1.5 w-1.5 rounded-full bg-violet"/> AI app building, simplified</div>
          <h1 className="mt-7 text-5xl font-bold leading-[1.03] tracking-[-.045em] sm:text-7xl">Turn an idea into a <span className="gradient-text">real app.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Describe what you want to build. Appo helps plan the product, generate a runnable app and give you a workspace to refine the result with AI.</p>
          <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/10 bg-[#10101a]/90 p-2 shadow-2xl shadow-violet/10 backdrop-blur-xl"><div className="rounded-[22px] border border-white/5 bg-white/[.025] p-4 text-left"><div className="flex items-start gap-3"><div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/15 text-violet-200">✦</div><p className="min-h-12 flex-1 text-sm leading-6 text-slate-300">Build a modern booking app for a fitness studio with customer accounts, class schedules, bookings, reminders and an admin dashboard.</p></div><div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3"><span className="text-[11px] text-slate-600">Describe your app in plain language</span><Link href="/signup" className="btn-accent px-4 py-2 text-xs">Build with AI →</Link></div></div></div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600"><span>✓ Runnable project</span><span>✓ Live preview</span><span>✓ Full code access</span><span>✓ AI refinement</span></div>
        </div>
      </section>

      <section id="workflow" className="border-y border-white/[.06] bg-white/[.015] py-20"><div className="mx-auto max-w-7xl px-5 sm:px-6"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From prompt to product, without the blank page.</h2><p className="mt-3 text-sm leading-6 text-slate-500">Appo keeps the experience simple while giving you room to go deeper when you need it.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{[["01","Describe","Tell Appo what you want to build and what the app needs to do."],["02","Generate","Appo analyzes the idea and creates a runnable project around it."],["03","Refine & ship","Preview, edit with AI or code, then keep iterating as your product grows."]].map(([n,t,b])=><RevealOnScroll key={n}><div className="rounded-3xl border border-white/10 bg-[#0e0e17] p-6"><span className="text-xs font-semibold text-violet-300">{n}</span><h3 className="mt-10 text-xl font-semibold">{t}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{b}</p></div></RevealOnScroll>)}</div></div></section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-6"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Built for the whole journey</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to keep building.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(([icon,title,body],i)=><RevealOnScroll key={title} delayMs={i*50}><div className="group rounded-3xl border border-white/10 bg-white/[.025] p-6 transition hover:-translate-y-1 hover:border-violet/20 hover:bg-violet/[.035]"><div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[.04] text-sm text-violet-200">{icon}</div><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{body}</p></div></RevealOnScroll>)}</div></section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6"><div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[.045] to-white/[.015] p-6 sm:p-10"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Try an idea</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Start from what you already have in your head.</h2><p className="mt-4 text-sm leading-6 text-slate-500">You don't need the perfect prompt. Appo can help turn a rough idea into a more structured starting point.</p><Link href="/signup" className="btn-accent mt-6 inline-flex text-sm">Create an app</Link></div><div className="grid gap-2">{examples.map((example)=><Link key={example} href="/signup" className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-slate-400 transition hover:border-violet/20 hover:bg-violet/5 hover:text-white">“{example}” <span className="float-right text-slate-600">→</span></Link>)}</div></div></div></section>

      <section id="pricing" className="border-y border-white/[.06] bg-white/[.015] py-16"><div className="mx-auto max-w-7xl px-5 sm:px-6"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Pricing</p><h2 className="mt-3 text-3xl font-bold">Start free. Upgrade when your ideas grow.</h2><p className="mt-3 text-sm text-slate-500">Use the same pricing logic already powering Appo's existing credit and feature gates.</p></div><PricingTable /></div></section>

      <section id="faq" className="mx-auto max-w-4xl px-5 py-20 sm:px-6"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">FAQ</p><h2 className="mt-3 text-3xl font-bold">Questions, answered.</h2></div><div className="mt-10 divide-y divide-white/[.08] rounded-3xl border border-white/10 bg-white/[.02]">{[["What does Appo generate?","Appo currently generates runnable React Native / Expo projects, with live preview and full code access."],["Can I edit the generated code?","Yes. The existing project includes a Monaco-powered editor and ZIP export workflow."],["Do I need to be a developer?","No. The core workflow starts with a plain-language description. Developers can still inspect and edit the generated project."],["Can I keep improving an app after generation?","Yes. The product is designed around iterative generation rather than a one-time export."]].map(([q,a])=><details key={q} className="group p-5"><summary className="cursor-pointer list-none text-sm font-medium text-slate-200">{q}<span className="float-right text-slate-600 group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{a}</p></details>)}</div></section>

      <footer className="border-t border-white/[.06] py-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 text-xs text-slate-600 sm:px-6 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><img src="/logo-icon.svg" alt="" className="h-6 w-6 rounded-lg"/> appo</div><p className="mt-2">Built by Techtig</p></div><div className="flex gap-5"><Link href="/terms" className="hover:text-slate-300">Terms</Link><Link href="/privacy" className="hover:text-slate-300">Privacy</Link><a href="#faq" className="hover:text-slate-300">Support</a></div></div></footer>
      <CookieConsent /><ChatbotWidget />
    </main>
  );
}
