import Link from "next/link";
import type { Metadata } from "next";
import { LandingFooter, LandingHeader } from "@/components/landing/sections";
import { PLANS, CREDIT_COSTS } from "@/lib/plans";
import { TEMPLATE_CATALOG } from "@/lib/templates/catalog";

export const metadata: Metadata = {
  title: "Help & documentation",
  description:
    "Getting started with Appo, how AI generation and editing work, templates, deployment, credits and billing, collaboration, security, and how to contact support.",
  alternates: { canonical: "/help" },
};

/**
 * Help centre.
 *
 * The footer and sidebar linked to /help from the start; the page did not
 * exist, so both produced a 404. Every section here describes behaviour
 * that is actually implemented, and where something is not implemented it
 * says so rather than describing an aspiration — a help page that
 * over-promises generates support tickets rather than preventing them.
 */

interface Topic {
  id: string;
  title: string;
  entries: { question: string; answer: React.ReactNode }[];
}

const TOPICS: Topic[] = [
  {
    id: "getting-started",
    title: "Getting started",
    entries: [
      {
        question: "What does Appo actually produce?",
        answer:
          "A complete, runnable Expo / React Native project — real source files, not a design mock-up or a static preview. You can read every file in the browser, download the whole project as a ZIP, or push it to your own GitHub repository.",
      },
      {
        question: "How do I create my first app?",
        answer: (
          <>
            Open the <Link href="/dashboard/generator" className="text-brand underline underline-offset-2">AI Builder</Link>{" "}
            and describe what you want in a sentence or two. Appo asks a few targeted follow-up questions, then generates
            the project. Starting from one of the{" "}
            <Link href="/dashboard/templates" className="text-brand underline underline-offset-2">{TEMPLATE_CATALOG.length} templates</Link>{" "}
            pre-fills the brief for you.
          </>
        ),
      },
      {
        question: "How long does a generation take?",
        answer:
          "Usually 30–90 seconds, depending on how large the app is. Generation is a single request, so there is no per-step progress to report — the builder shows the sequence it runs and real elapsed time rather than a progress bar that would be guessing.",
      },
    ],
  },
  {
    id: "ai-generation",
    title: "AI generation and editing",
    entries: [
      {
        question: "Which AI models does Appo use?",
        answer:
          "Requests are routed across Groq, Cerebras and OpenRouter, with Anthropic's Claude reserved for genuinely large or complex tasks. Routing considers task size, provider availability and cost. If a provider is rate limited or down, the request automatically moves to the next one.",
      },
      {
        question: "What does 'AI edit' change?",
        answer:
          "The current source of your project is loaded and sent to the model along with your instruction, so unrelated files are preserved. Every edit becomes a new immutable version, so you can compare and roll back.",
      },
      {
        question: "Is generated code checked before I see it?",
        answer:
          "Yes. Every generated project is validated before it is stored: unsafe file paths (which would escape the folder you unzip into), executables, credential filenames, oversized or over-numerous files, and embedded live API keys are all rejected. If validation fails, no credits are charged.",
      },
      {
        question: "Does Appo run the generated code?",
        answer:
          "No. Generated application code is never executed on Appo's servers. It is packaged into an immutable artifact for you to download, preview or deploy.",
      },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    entries: [
      {
        question: "What is in a template?",
        answer:
          "A description, a screen list, an architecture, and the brief Appo starts from. Choosing one pre-fills the builder — it does not generate anything until you press Generate, so you can edit the brief first.",
      },
      {
        question: "Are the template images screenshots?",
        answer:
          "No, and they are labelled as such in the product. They are illustrations of the layout each template produces. Nobody has generated these apps yet, so a screenshot would be a fabrication.",
      },
      {
        question: "What are community templates?",
        answer:
          "Projects other Appo users have chosen to publish. Appo does not review them, and they are labelled separately from the curated catalogue for that reason.",
      },
    ],
  },
  {
    id: "deployment",
    title: "Deployment",
    entries: [
      {
        question: "What can I deploy today?",
        answer:
          "Web releases. Deploying publishes the current version at a shareable Appo URL, backed by a checksummed artifact tied to that exact version, and records it in your deployment history.",
      },
      {
        question: "Can Appo publish to the App Store or Play Store?",
        answer:
          "Not today. Native build requests are recorded and tracked in Appo, but store submission needs your own Apple or Google developer account and credentials, which Appo does not hold. Anything that told you otherwise would be untrue.",
      },
      {
        question: "Can I roll back a deployment?",
        answer:
          "Yes. Every deployment references the version it shipped, so you can roll back to a previous release from the Deployments page.",
      },
    ],
  },
  {
    id: "billing",
    title: "Credits and billing",
    entries: [
      {
        question: "How do credits work?",
        answer: (
          <>
            Each plan includes a monthly credit allowance. A full app generation costs{" "}
            <strong className="text-ink">{CREDIT_COSTS.generateFullApp.toLocaleString("en-GB")}</strong> credits, an edit
            to an existing screen costs <strong className="text-ink">{CREDIT_COSTS.updateExistingScreen}</strong>, and web
            deployment and code export are free. The Free plan includes{" "}
            {PLANS.free.monthlyCredits.toLocaleString("en-GB")} credits, which covers a complete generation so you can
            judge the output before paying anything.
          </>
        ),
      },
      {
        question: "Am I charged if a generation fails?",
        answer:
          "No. Credits are reserved before the work starts and automatically refunded if it does not complete — whether that is a provider outage, a timeout, or output that fails validation. The response always states whether you were charged.",
      },
      {
        question: "What happens when I cancel?",
        answer:
          "Your account moves to the Free plan at the end of the paid period. Nothing is deleted — your projects, versions and deployments stay exactly where they are, and you can export them at any time.",
      },
      {
        question: "What happens if a payment fails?",
        answer:
          "Generation pauses until it is resolved, and your credit balance is frozen rather than consumed. Updating your payment method restores access as soon as the provider confirms it.",
      },
    ],
  },
  {
    id: "collaboration",
    title: "Collaboration",
    entries: [
      {
        question: "How do I invite someone?",
        answer:
          "From a project's Team page, as an editor or a viewer. They receive an email with a single-use link that expires after seven days.",
      },
      {
        question: "Are permissions actually enforced?",
        answer:
          "Yes, on the server. A viewer cannot make a change even by calling the API directly — the role is re-checked on every write, and row-level security in the database means one account cannot read another's projects regardless of what the interface allows.",
      },
    ],
  },
  {
    id: "security",
    title: "Security and privacy",
    entries: [
      {
        question: "Who can see my projects?",
        answer:
          "Only you, and anyone you explicitly invite or share a preview link with. Projects are private by default and isolated by row-level security in the database.",
      },
      {
        question: "What does Appo email me about?",
        answer:
          "Sign-ins, password and email changes, billing events, and things you asked for such as team invitations. Security alerts can be turned off in Settings, except for password changes and unrecognised devices, which are always sent.",
      },
      {
        question: "Can I export or delete everything?",
        answer: (
          <>
            Yes. <Link href="/dashboard/settings" className="text-brand underline underline-offset-2">Settings</Link>{" "}
            has both a full data export and permanent account deletion. Deletion removes your projects, subscription and
            payment records and cannot be undone.
          </>
        ),
      },
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    entries: [
      {
        question: "Google sign-in doesn't complete",
        answer:
          "Finish the sign-in in the same browser you started it in — the security code is tied to that session, so starting in one browser and finishing in another cannot work. If a link has expired, start again from the sign-in page.",
      },
      {
        question: "Generation failed",
        answer:
          "The error message says what happened and confirms no credits were charged. Provider outages are usually brief; trying again in a minute is normally enough. If every attempt fails, contact support with the time it happened.",
      },
      {
        question: "My reset link says it expired",
        answer:
          "Reset links are single-use and valid for 60 minutes. Request a new one from the forgot-password page — it will work immediately.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <LandingHeader />

      <main id="main" className="app-container py-12 lg:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Help</p>
          <h1 className="mt-2 text-page font-semibold tracking-tight text-ink">Documentation and support</h1>
          <p className="mt-3 text-body leading-relaxed text-ink-secondary">
            Everything below describes what Appo does today. Where a capability is not built yet, it says so.
          </p>

          <nav aria-label="Help topics" className="mt-8 flex flex-wrap gap-1.5">
            {TOPICS.map((topic) => (
              <a
                key={topic.id}
                href={`#${topic.id}`}
                className="rounded-full border border-line bg-canvas-subtle px-3 py-1.5 text-caption font-medium text-ink-secondary transition-colors duration-micro hover:border-line-strong hover:text-ink"
              >
                {topic.title}
              </a>
            ))}
          </nav>

          <div className="mt-12 space-y-12">
            {TOPICS.map((topic) => (
              <section key={topic.id} id={topic.id} className="scroll-mt-20">
                <h2 className="text-section font-semibold tracking-tight text-ink">{topic.title}</h2>
                <div className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
                  {topic.entries.map((entry) => (
                    <details key={entry.question} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-body font-medium text-ink transition-colors duration-micro hover:bg-canvas-subtle">
                        {entry.question}
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          aria-hidden="true"
                          className="shrink-0 text-ink-muted transition-transform duration-fast group-open:rotate-45"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </summary>
                      <div className="px-5 pb-5 text-small leading-relaxed text-ink-secondary">{entry.answer}</div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <section id="support" className="scroll-mt-20">
              <h2 className="text-section font-semibold tracking-tight text-ink">Contact support</h2>
              <div className="card mt-4 p-5">
                <p className="text-small leading-relaxed text-ink-secondary">
                  If something here did not answer your question, email{" "}
                  <a href="mailto:support@appo.app" className="text-brand underline underline-offset-2">
                    support@appo.app
                  </a>
                  . Including the time it happened and the project name gets you a useful answer fastest — those are what
                  let us find the exact request in the logs.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/generator" className="btn btn-primary btn-sm">
                    Open the builder
                  </Link>
                  <Link href="/changelog" className="btn btn-secondary btn-sm">
                    What&apos;s new
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
