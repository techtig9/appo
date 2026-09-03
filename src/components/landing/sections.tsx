import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { RevealOnScroll } from "@/components/RevealOnScroll";

/**
 * Shared building blocks for the marketing page.
 *
 * Server components with no client JavaScript except the scroll reveal —
 * the landing page is the one screen where every kilobyte is measured
 * against a conversion rate.
 */

export function Section({
  id,
  children,
  className,
  bordered,
  muted,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  bordered?: boolean;
  muted?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "app-section",
        bordered && "border-t border-line",
        muted && "bg-canvas-subtle",
        className
      )}
    >
      <div className="app-container">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className="mt-3 text-balance text-section font-semibold tracking-tight text-ink sm:text-[1.75rem]">{title}</h2>
      {description ? <p className="mt-3 text-body leading-relaxed text-ink-secondary">{description}</p> : null}
    </div>
  );
}

export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: { title: string; body: string; icon?: ReactNode }[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "mt-12 grid gap-4",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {items.map((item, index) => (
        <RevealOnScroll key={item.title} delayMs={index * 60}>
          <div className="card h-full p-5">
            {item.icon ? (
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-canvas-subtle text-ink-secondary">
                {item.icon}
              </div>
            ) : null}
            <h3 className="text-body font-semibold text-ink">{item.title}</h3>
            <p className="mt-2 text-small leading-relaxed text-ink-secondary">{item.body}</p>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}

export function StepList({ steps }: { steps: { number: string; title: string; body: string }[] }) {
  return (
    <ol className="mt-12 grid gap-4 md:grid-cols-3">
      {steps.map((step, index) => (
        <RevealOnScroll key={step.number} delayMs={index * 70}>
          <li className="card relative h-full p-5">
            <span className="font-mono text-caption font-semibold text-brand">{step.number}</span>
            <h3 className="mt-6 text-card font-semibold tracking-tight text-ink">{step.title}</h3>
            <p className="mt-2 text-small leading-relaxed text-ink-secondary">{step.body}</p>
          </li>
        </RevealOnScroll>
      ))}
    </ol>
  );
}

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-line overflow-hidden rounded-lg border border-line">
      {items.map((item) => (
        // <details> gives keyboard operation, screen reader semantics and a
        // working no-JS experience for free. A hand-rolled accordion gives
        // none of that without extra work.
        <details key={item.question} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-body font-medium text-ink transition-colors duration-micro hover:bg-canvas-subtle">
            {item.question}
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
          <p className="px-5 pb-5 text-small leading-relaxed text-ink-secondary">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-header border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="app-container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-md" />
          <span className="text-body font-semibold tracking-tight text-ink">Appo</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 text-small text-ink-secondary md:flex">
          <a href="#how" className="transition-colors duration-micro hover:text-ink">How it works</a>
          <a href="#capabilities" className="transition-colors duration-micro hover:text-ink">Capabilities</a>
          <a href="#templates" className="transition-colors duration-micro hover:text-ink">Templates</a>
          <a href="#pricing" className="transition-colors duration-micro hover:text-ink">Pricing</a>
          <a href="#faq" className="transition-colors duration-micro hover:text-ink">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-9 items-center rounded-md px-3 text-small text-ink-secondary transition-colors duration-micro hover:text-ink sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-md bg-brand px-3.5 text-small font-medium text-brand-contrast transition-colors duration-micro hover:bg-brand-hover"
          >
            Start building free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  const columns = [
    {
      title: "Product",
      links: [
        { label: "How it works", href: "#how" },
        { label: "Capabilities", href: "#capabilities" },
        { label: "Templates", href: "#templates" },
        { label: "Pricing", href: "#pricing" },
        { label: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help centre", href: "/help" },
        { label: "Getting started", href: "/help#getting-started" },
        { label: "Deployment", href: "/help#deployment" },
        { label: "Billing & credits", href: "/help#billing" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Security", href: "/help#security" },
        { label: "Contact support", href: "/help#support" },
      ],
    },
  ];

  return (
    <footer className="border-t border-line bg-canvas-subtle">
      <div className="app-container py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.svg" alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-md" />
              <span className="text-body font-semibold tracking-tight text-ink">Appo</span>
            </Link>
            <p className="mt-3 max-w-xs text-small leading-relaxed text-ink-secondary">
              Describe an app. Appo plans it, builds it, and gives you a workspace to refine and ship it.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-muted">{column.title}</h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-small text-ink-secondary transition-colors duration-micro hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-caption text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Appo. All rights reserved.</p>
          <p>Built by TechTig.</p>
        </div>
      </div>
    </footer>
  );
}
