"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

/**
 * The destination for the header's search field.
 *
 * That field previously had no submit handler and no destination at all —
 * typing into it and pressing Enter did nothing. This page is where it
 * goes.
 */

interface Hit {
  type: "project" | "template" | "page";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface Results {
  projects: Hit[];
  templates: Hit[];
  pages: Hit[];
}

function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q") ?? "";

  const [term, setTerm] = useState(query);
  const [results, setResults] = useState<Results | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => setTerm(query), [query]);

  const load = useCallback(async () => {
    if (!query.trim()) {
      setStatus("idle");
      setResults(null);
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=12`);
      if (!response.ok) {
        setStatus("error");
        return;
      }
      const payload = (await response.json()) as { results: Results };
      setResults(payload.results);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = results ? results.projects.length + results.templates.length + results.pages.length : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-page font-semibold tracking-tight text-ink">Search</h1>
        <form
          role="search"
          className="mt-4"
          onSubmit={(event) => {
            event.preventDefault();
            router.replace(`/dashboard/search?q=${encodeURIComponent(term.trim())}`);
          }}
        >
          <label htmlFor="search-input" className="sr-only">
            Search projects, templates and pages
          </label>
          <input
            id="search-input"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search projects, templates and settings…"
            autoFocus
            className="input h-11"
          />
        </form>
        {status === "ready" ? (
          <p aria-live="polite" className="mt-3 text-caption text-ink-muted">
            {total === 0 ? `No results for "${query}"` : `${total} result${total === 1 ? "" : "s"} for "${query}"`}
          </p>
        ) : null}
      </header>

      {status === "idle" ? (
        <EmptyState
          title="Search your workspace"
          description="Find a project by name, a template by what it does, or jump straight to a settings page. Press ⌘K anywhere for the same search."
        />
      ) : null}

      {status === "loading" ? <LoadingState label="Searching…" /> : null}
      {status === "error" ? <ErrorState detail="The search request failed." onRetry={() => void load()} /> : null}

      {status === "ready" && results ? (
        total === 0 ? (
          <EmptyState
            title="Nothing matched"
            description="Try a shorter or more general term. Search covers your project names, the template catalogue and workspace pages."
            action={{ label: "Browse templates", href: "/dashboard/templates" }}
          />
        ) : (
          <div className="space-y-6">
            <Group title="Your projects" hits={results.projects} emptyHint="No projects match that name." />
            <Group title="Templates" hits={results.templates} emptyHint="No templates match that." />
            <Group title="Pages" hits={results.pages} />
          </div>
        )
      ) : null}
    </div>
  );
}

function Group({ title, hits, emptyHint }: { title: string; hits: Hit[]; emptyHint?: string }) {
  if (hits.length === 0 && !emptyHint) return null;

  return (
    <section>
      <h2 className="mb-2 text-caption font-semibold uppercase tracking-wider text-ink-muted">{title}</h2>
      {hits.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-4 text-caption text-ink-muted">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
          {hits.map((hit) => (
            <li key={`${hit.type}-${hit.id}`}>
              <Link href={hit.href} className="block px-4 py-3 transition-colors duration-micro hover:bg-canvas-subtle">
                <span className="block text-small font-medium text-ink">{hit.title}</span>
                {hit.subtitle ? <span className="mt-0.5 block truncate text-caption text-ink-muted">{hit.subtitle}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SearchResults />
    </Suspense>
  );
}
