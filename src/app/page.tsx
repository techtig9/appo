import Link from "next/link";
import type { Metadata } from "next";
import { PricingTable } from "@/components/PricingTable";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { CookieConsent } from "@/components/CookieConsent";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { BuilderPreview } from "@/components/landing/BuilderPreview";
import { Faq, FeatureGrid, LandingFooter, LandingHeader, Section, SectionHeading, StepList } from "@/components/landing/sections";
import { TEMPLATE_CATALOG } from "@/lib/templates/catalog";
import { renderTemplateThumbnail } from "@/lib/templates/thumbnail";
import { CATEGORY_LABELS } from "@/lib/templates/types";

export const metadata: Metadata = {
  title: "Appo — Build apps with AI. Ship ideas faster.",
  description:
    "Describe an app in plain language. Appo plans the product, generates a runnable project, and gives you a workspace to refine, version and deploy it.",
  alternates: { canonical: "/" },
};

/**
 * The landing page.
 *
 * Structure follows the fifteen-section brief: navbar, hero, product
 * preview, how it works, AI capabilities, builder showcase, templates,
 * developer workflow, collaboration, deployment, analytics, pricing, FAQ,
 * final CTA, footer.
 *
 * Two rules held throughout:
 *  - Nothing claims a capability the product does not have. There are no
 *    invented customer logos, no fabricated "10,000 developers" counters
 *    and no review quotes, because none of those exist yet.
 *  - The template strip is rendered from the real catalogue with the real
 *    generated previews, so the marketing page and the product cannot
 *    disagree about what is on offer.
 */

const FEATURED_TEMPLATES = TEMPLATE_CATALOG.filter((template) => template.featured).slice(0, 6);

export default function LandingPage() {
  return (
    <>
      <LandingHeader />

      <main id="main">
        {/* 2 — Hero */}
        <section className="relative overflow-hidden">
          {/* One restrained wash behind the hero. Not on every section. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] max-w-none -translate-x-1/2 rounded-full opacity-[0.14] blur-[120px]"
            style={{ background: "var(--app-gradient-brand)" }}
          />

          <div className="app-container relative pb-14 pt-14 sm:pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-caption text-ink-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-ai" aria-hidden="true" />
                Multi-provider AI generation with automatic failover
              </p>

              <h1 className="mt-6 text-balance text-[2.5rem] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[3.5rem] lg:text-hero">
                Build apps with AI.
                <br />
                <span className="gradient-text">Ship ideas faster.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-body-lg leading-relaxed text-ink-secondary">
                Describe what you want to build. Appo plans the product, generates a runnable project, and gives you a
                real workspace to refine, version and deploy it.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand px-6 text-body-lg font-medium text-brand-contrast transition-colors duration-micro hover:bg-brand-hover sm:w-auto"
                >
                  Start Building Free
                </Link>
                <Link
                  href="/dashboard/templates"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-6 text-body-lg font-medium text-ink transition-colors duration-micro hover:border-line-strong sm:w-auto"
                >
                  Explore Templates
                </Link>
              </div>

              <p className="mt-4 text-caption text-ink-muted">
                Free plan includes enough credits for a full app generation. No card required.
              </p>
            </div>

            {/* 3 — Real product preview */}
            <div className="mx-auto mt-14 max-w-5xl">
              <BuilderPreview />
            </div>
          </div>
        </section>

        {/* 4 — How it works */}
        <Section id="how" bordered muted>
          <SectionHeading
            eyebrow="How it works"
            title="From a sentence to a running project"
            description="Three steps, and you can stop at any of them and keep the code."
          />
          <StepList
            steps={[
              {
                number: "01",
                title: "Describe it",
                body: "Write what the app should do in plain language. Appo asks a few targeted follow-up questions instead of a 40-field form.",
              },
              {
                number: "02",
                title: "Appo builds it",
                body: "The request is planned, an architecture is chosen, and a complete project is generated — then validated before you ever see it.",
              },
              {
                number: "03",
                title: "Refine and ship",
                body: "Preview it, ask for changes in conversation, compare versions, roll back, and deploy when it is ready.",
              },
            ]}
          />
        </Section>

        {/* 5 — AI capabilities */}
        <Section id="capabilities" bordered>
          <SectionHeading
            eyebrow="AI engine"
            title="Routing built for real workloads, not demos"
            description="Four providers behind one interface, chosen per request on complexity, availability and cost."
          />
          <FeatureGrid
            items={[
              {
                title: "Automatic failover",
                body: "Groq, then Cerebras, then OpenRouter, with Claude reserved for genuinely large tasks. A rate limit on one provider is not an outage for you.",
              },
              {
                title: "Bounded retries",
                body: "Transient faults get one more attempt; a 400 or a bad key does not, because retrying it only wastes your time.",
              },
              {
                title: "Hard timeouts",
                body: "Every provider call carries an explicit budget, so a stalled connection surfaces as an error you can act on rather than a spinner.",
              },
              {
                title: "Output validation",
                body: "Generated files are checked for unsafe paths, oversized output and embedded credentials before anything is stored or downloadable.",
              },
              {
                title: "Cost-aware routing",
                body: "Task size is estimated from your request, so a small change does not get billed at large-model prices.",
              },
              {
                title: "You are never charged for a failure",
                body: "Credits are reserved atomically and refunded automatically if a generation does not complete.",
              },
            ]}
          />
        </Section>

        {/* 6 — Builder showcase */}
        <Section bordered muted>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="The builder"
                align="left"
                title="A workspace, not a chat box"
                description="Files on the left, the AI and your code in the middle, a live preview on the right. Everything you need to actually finish something."
              />
              <ul className="mt-8 space-y-3">
                {[
                  "Conversational edits that preserve the rest of your project",
                  "Version history with a diff, and one-click rollback",
                  "Full code access and a ZIP export you own",
                  "Real generation stages — never a fake progress bar",
                  "Command palette and keyboard shortcuts throughout",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-small leading-relaxed text-ink-secondary">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
                      <path d="m7.5 12.5 3 3 6-6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <RevealOnScroll>
              <BuilderPreview />
            </RevealOnScroll>
          </div>
        </Section>

        {/* 7 — Templates */}
        <Section id="templates" bordered>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              align="left"
              eyebrow="Templates"
              title={`${TEMPLATE_CATALOG.length} starting points, not five`}
              description="Every template comes with its own screens, architecture and seed prompt. Start from one and change anything."
            />
            <Link href="/dashboard/templates" className="text-small font-medium text-brand underline-offset-4 hover:underline">
              Browse all {TEMPLATE_CATALOG.length} →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED_TEMPLATES.map((template, index) => (
              <RevealOnScroll key={template.slug} delayMs={index * 50}>
                <article className="card card-interactive group h-full overflow-hidden">
                  <div className="overflow-hidden border-b border-line bg-canvas-subtle">
                    {/* The real generated preview, inlined so the landing
                        page needs no extra request per card. */}
                    <div
                      className="transition-transform duration-normal ease-out group-hover:scale-[1.03] [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: renderTemplateThumbnail(template) }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="badge">{CATEGORY_LABELS[template.category]}</span>
                      <span className="text-caption text-ink-muted">{template.platforms.join(" · ")}</span>
                    </div>
                    <h3 className="mt-3 text-body font-semibold text-ink">{template.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-small leading-relaxed text-ink-secondary">{template.description}</p>
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </Section>

        {/* 8 — Developer workflow */}
        <Section bordered muted>
          <SectionHeading
            eyebrow="Developer workflow"
            title="It behaves like a tool you already know"
            description="Generated code is yours. Nothing here locks it behind an editor you cannot leave."
          />
          <FeatureGrid
            columns={4}
            items={[
              { title: "File explorer", body: "Browse and open every file in the generated project." },
              { title: "Version history", body: "Each generation and edit is an immutable, checksummed release." },
              { title: "GitHub export", body: "Push a generated project straight to a repository you control." },
              { title: "ZIP download", body: "Take the whole project with you at any time, on any paid plan." },
            ]}
          />
        </Section>

        {/* 9 — Collaboration */}
        <Section bordered>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <SectionHeading
              align="left"
              eyebrow="Collaboration"
              title="Bring the rest of the team in"
              description="Invite people as editors or viewers. Permissions are enforced on the server, not hidden in the interface — a viewer cannot make a change even by calling the API directly."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: "Roles", body: "Owner, editor and viewer, checked on every write." },
                { title: "Invitations", body: "Emailed, single-use, and expiring after seven days." },
                { title: "Activity", body: "A record of who changed what, and when." },
                { title: "Sharing", body: "A public preview link per project, revocable at any time." },
              ].map((item) => (
                <div key={item.title} className="card p-4">
                  <h3 className="text-small font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-caption leading-relaxed text-ink-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 10 — Deployment */}
        <Section bordered muted>
          <SectionHeading
            eyebrow="Deployment"
            title="Ship it, and know exactly what shipped"
            description="Every release is a checksummed artifact tied to a version. Status is reported honestly at each stage."
          />
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {["Queued", "Building", "Testing", "Deploying", "Live"].map((stage, index, all) => (
              <div key={stage} className="flex items-center gap-2">
                <span
                  className={cnStage(index, all.length)}
                >
                  {stage}
                </span>
                {index < all.length - 1 ? <span className="h-px w-4 bg-line sm:w-8" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-caption leading-relaxed text-ink-muted">
            Web deployment is available today. Native builds are recorded and tracked, but Appo does not submit to the
            App Store or Play Store on your behalf — that needs your own developer account, and we will not claim
            otherwise.
          </p>
        </Section>

        {/* 11 — Analytics */}
        <Section bordered>
          <SectionHeading
            eyebrow="Analytics"
            title="Numbers from your account, not a mock-up"
            description="Generations, success and failure rates, credit consumption, deployments and template usage — all computed from what actually happened."
          />
          <FeatureGrid
            columns={4}
            items={[
              { title: "Usage", body: "Credits consumed, by action and by day." },
              { title: "Reliability", body: "Generation success and failure counts over time." },
              { title: "Deployments", body: "What went live, when, and from which version." },
              { title: "Projects", body: "Activity across every app in your workspace." },
            ]}
          />
        </Section>

        {/* 12 — Pricing */}
        <Section id="pricing" bordered muted>
          <SectionHeading
            eyebrow="Pricing"
            title="Start free. Upgrade when it earns it."
            description="Every plan includes a monthly credit allowance. Failed generations are never charged."
          />
          <div className="mt-12">
            <PricingTable />
          </div>
        </Section>

        {/* 13 — FAQ */}
        <Section id="faq" bordered>
          <SectionHeading eyebrow="FAQ" title="Questions worth asking first" />
          <Faq
            items={[
              {
                question: "Do I own the code Appo generates?",
                answer:
                  "Yes. Generated projects are yours. On any paid plan you can download the full source as a ZIP or push it to your own GitHub repository, and nothing in it depends on Appo continuing to exist.",
              },
              {
                question: "What happens if a generation fails?",
                answer:
                  "You are not charged. Credits are reserved before the work starts and automatically refunded if it does not complete, so a provider outage never costs you anything.",
              },
              {
                question: "Which AI models does Appo use?",
                answer:
                  "Appo routes across Groq, Cerebras and OpenRouter, with Anthropic's Claude reserved for genuinely large or complex tasks. Routing considers task size, provider availability and cost — if one provider is rate limited, the request moves to the next automatically.",
              },
              {
                question: "Can Appo publish my app to the App Store?",
                answer:
                  "Not today. Web deployment works end to end. Native builds are recorded and tracked in Appo, but store submission requires your own Apple or Google developer account, and we would rather say so than imply otherwise.",
              },
              {
                question: "What happens to my projects if I cancel?",
                answer:
                  "Nothing is deleted. Your account moves to the Free plan and your projects stay exactly where they are. You can export them at any time before or after cancelling.",
              },
              {
                question: "How is my data handled?",
                answer:
                  "Projects are private by default and protected by row-level security in the database, so one account cannot read another's data even through the API. You can export everything or delete your account permanently from Settings.",
              },
            ]}
          />
        </Section>

        {/* 14 — Final CTA */}
        <Section bordered muted>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-section font-semibold tracking-tight text-ink sm:text-[1.75rem]">
              Describe your app. See it running.
            </h2>
            <p className="mt-3 text-body leading-relaxed text-ink-secondary">
              The free plan includes enough credits for a complete generation, so you can judge the output before
              deciding anything.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand px-6 text-body-lg font-medium text-brand-contrast transition-colors duration-micro hover:bg-brand-hover sm:w-auto"
              >
                Start Building Free
              </Link>
              <Link
                href="/dashboard/templates"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-line bg-surface px-6 text-body-lg font-medium text-ink transition-colors duration-micro hover:border-line-strong sm:w-auto"
              >
                Explore Templates
              </Link>
            </div>
          </div>
        </Section>
      </main>

      <LandingFooter />
      <CookieConsent />
      <ChatbotWidget />
    </>
  );
}

/** The deployment strip's first stage is emphasised; the rest are neutral. */
function cnStage(index: number, total: number): string {
  const base = "rounded-md border px-3 py-1.5 text-caption font-medium";
  if (index === total - 1) return `${base} border-success/40 bg-success-subtle text-success`;
  if (index === 0) return `${base} border-brand-border bg-brand-subtle text-brand`;
  return `${base} border-line bg-surface text-ink-secondary`;
}
