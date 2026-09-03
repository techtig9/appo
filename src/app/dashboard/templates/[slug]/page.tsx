import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTemplateBySlug, TEMPLATE_CATALOG, thumbnailPathFor } from "@/lib/templates/catalog";
import { relatedTemplates } from "@/lib/templates/query";
import { CATEGORY_LABELS } from "@/lib/templates/types";
import { UseTemplateButton } from "@/components/templates/UseTemplateButton";

/**
 * Template detail.
 *
 * A server component reading straight from the in-process catalogue —
 * there is no reason to make the browser fetch data the server already
 * has, and it means the page is fully rendered in the HTML for anyone who
 * lands on it from a shared link.
 */

export function generateStaticParams() {
  return TEMPLATE_CATALOG.map((template) => ({ slug: template.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const template = getTemplateBySlug(params.slug);
  if (!template) return { title: "Template not found" };
  return {
    title: template.name,
    description: template.description,
    openGraph: { title: `${template.name} — Appo template`, description: template.description },
  };
}

const DIFFICULTY_COPY: Record<string, string> = {
  starter: "A focused app with no backend required — the quickest thing to get running.",
  intermediate: "Includes authentication and persistence, so expect a real data model.",
  advanced: "A substantial application with several moving parts and real integration work.",
};

export default function TemplateDetailPage({ params }: { params: { slug: string } }) {
  const template = getTemplateBySlug(params.slug);
  if (!template) notFound();

  const related = relatedTemplates(template.slug);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-caption text-ink-muted">
        <Link href="/dashboard/templates" className="transition-colors duration-micro hover:text-ink">
          Templates
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/dashboard/templates?category=${template.category}`}
          className="transition-colors duration-micro hover:text-ink"
        >
          {CATEGORY_LABELS[template.category]}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-secondary">{template.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-line bg-canvas-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailPathFor(template.slug)}
              alt={`Layout preview for ${template.name}`}
              width={640}
              height={400}
              className="block h-auto w-full"
            />
          </div>
          <p className="text-caption text-ink-muted">
            {/* Said plainly rather than implying this is a screenshot of a
                finished app. Nobody has generated this one yet. */}
            An illustration of the layout this template produces — not a screenshot of a generated app.
          </p>

          <section>
            <h2 className="text-card font-semibold tracking-tight text-ink">What Appo builds</h2>
            <p className="mt-2 text-body leading-relaxed text-ink-secondary">{template.description}</p>
          </section>

          <section>
            <h2 className="text-card font-semibold tracking-tight text-ink">Screens</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {template.screens.map((screen) => (
                <li key={screen} className="flex items-center gap-2.5 rounded-md border border-line bg-canvas-subtle px-3 py-2.5 text-small text-ink-secondary">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {screen}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-card font-semibold tracking-tight text-ink">The brief Appo starts from</h2>
            <p className="mt-2 text-small leading-relaxed text-ink-secondary">
              This is pre-filled in the builder. Edit it as much as you like before generating — nothing is charged until
              you do.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md border border-line bg-canvas-subtle p-4 font-mono text-caption leading-relaxed text-ink-secondary">
              <code>{template.prompt}</code>
            </pre>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h1 className="text-section font-semibold tracking-tight text-ink">{template.name}</h1>

            <dl className="mt-4 space-y-2.5 border-t border-line pt-4">
              <Row label="Category" value={CATEGORY_LABELS[template.category]} />
              <Row label="Platforms" value={template.platforms.join(", ")} />
              <Row label="Difficulty" value={template.difficulty} />
              <Row label="Screens" value={String(template.screens.length)} />
            </dl>

            <p className="mt-4 text-caption leading-relaxed text-ink-muted">{DIFFICULTY_COPY[template.difficulty]}</p>

            <UseTemplateButton slug={template.slug} name={template.name} />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {template.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/dashboard/templates?q=${encodeURIComponent(tag)}`}
                  className="rounded border border-line bg-canvas-subtle px-1.5 py-0.5 text-caption text-ink-muted transition-colors duration-micro hover:text-ink"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>

          {related.length > 0 ? (
            <div className="card p-5">
              <h2 className="text-small font-semibold text-ink">Similar templates</h2>
              <ul className="mt-3 space-y-1">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/dashboard/templates/${item.slug}`}
                      className="-mx-2 block rounded-md px-2 py-2 transition-colors duration-micro hover:bg-canvas-subtle"
                    >
                      <span className="block text-small font-medium text-ink">{item.name}</span>
                      <span className="mt-0.5 block truncate text-caption text-ink-muted">{item.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-caption capitalize text-ink-secondary">{value}</dd>
    </div>
  );
}
