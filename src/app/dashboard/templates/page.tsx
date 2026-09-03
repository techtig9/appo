"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { EmptyState, ErrorState, SkeletonCardGrid } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";

/**
 * Template marketplace.
 *
 * Replaces a page that rendered five database rows with no images, no
 * descriptions and the same sentence of copy on every card. Every filter
 * here maps to a real query parameter, the URL is the source of truth (so
 * a filtered view is shareable and survives a refresh), and cards always
 * carry a real preview.
 */

interface TemplateItem {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  platforms: string[];
  difficulty: string;
  thumbnail: string;
  featured?: boolean;
  isNew?: boolean;
}

interface CommunityItem {
  id: string;
  name: string;
  tags: string[];
  platforms: string[];
  thumbnail: string;
}

interface Facet {
  value: string;
  label: string;
  count: number;
}

interface ApiResponse {
  templates: TemplateItem[];
  pagination: { total: number; page: number; perPage: number; totalPages: number };
  community: CommunityItem[];
  facets: { categories: Facet[]; tags: string[] };
}

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most used" },
  { value: "newest", label: "Newest" },
  { value: "name", label: "A–Z" },
] as const;

const FAVOURITES_KEY = "appo-template-favourites";

function TemplatesBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  const category = params.get("category") ?? "all";
  const sort = params.get("sort") ?? "recommended";
  const page = Number(params.get("page") ?? "1");
  const urlQuery = params.get("q") ?? "";

  const [searchText, setSearchText] = useState(urlQuery);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorDetail, setErrorDetail] = useState<string>();
  const [favourites, setFavourites] = useState<string[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVOURITES_KEY);
      if (stored) setFavourites(JSON.parse(stored) as string[]);
    } catch {
      // Blocked storage or corrupt value — favourites are a convenience,
      // not something worth failing the page over.
    }
  }, []);

  // Keep the input in step when the URL changes from outside (back button,
  // a link, clearing a filter).
  useEffect(() => setSearchText(urlQuery), [urlQuery]);

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const merged = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "" || value === "all") merged.delete(key);
        else merged.set(key, value);
      }
      // Any filter change resets pagination — otherwise a narrower filter
      // lands the user on an empty page 4.
      if (!("page" in next)) merged.delete("page");
      router.replace(`/dashboard/templates${merged.toString() ? `?${merged}` : ""}`, { scroll: false });
    },
    [params, router]
  );

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setStatus("loading");

    const query = new URLSearchParams();
    if (urlQuery) query.set("q", urlQuery);
    if (category !== "all") query.set("category", category);
    if (sort !== "recommended") query.set("sort", sort);
    if (page > 1) query.set("page", String(page));

    try {
      const response = await fetch(`/api/templates?${query}`);
      // Discard a response that has been superseded by a newer request.
      if (id !== requestId.current) return;

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorDetail(payload?.error ?? "The marketplace could not be loaded.");
        setStatus("error");
        return;
      }
      setData((await response.json()) as ApiResponse);
      setStatus("ready");
    } catch {
      if (id !== requestId.current) return;
      setErrorDetail("We couldn't reach the marketplace. Check your connection and try again.");
      setStatus("error");
    }
  }, [urlQuery, category, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleFavourite(slug: string) {
    setFavourites((current) => {
      const next = current.includes(slug) ? current.filter((entry) => entry !== slug) : [...current, slug];
      try {
        window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next));
      } catch {
        toast({ title: "Couldn't save that favourite", description: "Your browser is blocking site storage.", tone: "warning" });
      }
      return next;
    });
  }

  const categories = useMemo<Facet[]>(
    () => [{ value: "all", label: "All", count: data?.pagination.total ?? 0 }, ...(data?.facets.categories ?? [])],
    [data]
  );

  const hasFilters = Boolean(urlQuery) || category !== "all";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Marketplace</p>
          <h1 className="mt-1.5 text-page font-semibold tracking-tight text-ink">Start from a template</h1>
          <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-secondary">
            Every template comes with its own screens and architecture. Pick one, adjust the brief, and Appo builds it.
          </p>
        </div>
        {data ? <span className="badge">{data.pagination.total} templates</span> : null}
      </header>

      {/* Filters */}
      <div className="space-y-3">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            updateParams({ q: searchText.trim() || null });
          }}
          className="flex flex-wrap gap-2"
        >
          <label htmlFor="template-search" className="sr-only">
            Search templates
          </label>
          <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas-subtle px-3 transition-colors duration-micro focus-within:border-brand">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-ink-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.6-3.6" />
            </svg>
            <input
              id="template-search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by name, category or what it does…"
              className="min-w-0 flex-1 bg-transparent text-small text-ink outline-none placeholder:text-ink-muted"
            />
            {searchText ? (
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  updateParams({ q: null });
                }}
                aria-label="Clear search"
                className="shrink-0 rounded p-0.5 text-ink-muted hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : null}
          </div>

          <label htmlFor="template-sort" className="sr-only">
            Sort templates
          </label>
          <select
            id="template-sort"
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value })}
            className="h-10 shrink-0 rounded-md border border-line bg-canvas-subtle px-3 text-small text-ink outline-none focus:border-brand"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </form>

        {/* Horizontally scrollable on narrow screens rather than wrapping
            into five rows of chips. */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {categories.map((facet) => (
            <button
              key={facet.value}
              type="button"
              onClick={() => updateParams({ category: facet.value })}
              aria-pressed={category === facet.value}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-caption font-medium transition-colors duration-micro",
                category === facet.value
                  ? "border-brand-border bg-brand-subtle text-brand"
                  : "border-line bg-canvas-subtle text-ink-secondary hover:border-line-strong hover:text-ink"
              )}
            >
              {facet.label}
              {facet.value !== "all" ? <span className="ml-1.5 text-ink-muted">{facet.count}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" ? <SkeletonCardGrid count={6} /> : null}

      {status === "error" ? <ErrorState detail={errorDetail} onRetry={() => void load()} /> : null}

      {status === "ready" && data ? (
        data.templates.length === 0 ? (
          <EmptyState
            title="No templates match that"
            description={
              hasFilters
                ? "Nothing in the catalogue matches your search and filters. Try a broader term, or clear the filters to see everything."
                : "The catalogue is empty, which should not happen — please contact support."
            }
            action={hasFilters ? { label: "Clear filters", onClick: () => router.replace("/dashboard/templates") } : undefined}
            secondaryAction={{ label: "Describe your own app", href: "/dashboard/generator" }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {data.templates.map((template) => (
                <TemplateCard
                  key={template.slug}
                  template={template}
                  favourite={favourites.includes(template.slug)}
                  onToggleFavourite={() => toggleFavourite(template.slug)}
                />
              ))}
            </div>

            {data.pagination.totalPages > 1 ? (
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                onChange={(next) => {
                  updateParams({ page: String(next) });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            ) : null}

            {data.community.length > 0 ? (
              <section className="pt-4">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h2 className="text-card font-semibold tracking-tight text-ink">Community templates</h2>
                  <span className="text-caption text-ink-muted">Published by other Appo builders</span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {data.community.map((item) => (
                    <article key={item.id} className="card overflow-hidden">
                      <div className="border-b border-line bg-canvas-subtle">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt="" width={640} height={400} className="block h-auto w-full" loading="lazy" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="badge">Community</span>
                          <span className="text-caption text-ink-muted">{item.platforms.join(" · ")}</span>
                        </div>
                        <h3 className="mt-3 text-body font-semibold text-ink">{item.name}</h3>
                        <p className="mt-1.5 text-small leading-relaxed text-ink-secondary">
                          Published by another Appo user. Appo has not reviewed this project.
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )
      ) : null}
    </div>
  );
}

function TemplateCard({
  template,
  favourite,
  onToggleFavourite,
}: {
  template: TemplateItem;
  favourite: boolean;
  onToggleFavourite: () => void;
}) {
  return (
    <article className="card card-interactive group relative flex h-full flex-col overflow-hidden">
      <div className="relative overflow-hidden border-b border-line bg-canvas-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={template.thumbnail}
          alt={`Layout preview for ${template.name}`}
          width={640}
          height={400}
          loading="lazy"
          className="block h-auto w-full transition-transform duration-normal ease-out group-hover:scale-[1.04]"
        />
        <button
          type="button"
          onClick={onToggleFavourite}
          aria-pressed={favourite}
          aria-label={favourite ? `Remove ${template.name} from favourites` : `Add ${template.name} to favourites`}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface/90 text-ink-muted backdrop-blur transition-colors duration-micro hover:text-ink"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={favourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true" className={favourite ? "text-brand" : undefined}>
            <path d="M12 4.8 13.9 9l4.6.4-3.5 3 1.1 4.5L12 14.6 7.9 16.9 9 12.4l-3.5-3L10.1 9 12 4.8Z" />
          </svg>
        </button>

        {template.featured || template.isNew ? (
          <span className="absolute left-2.5 top-2.5 rounded-md bg-surface/90 px-2 py-0.5 text-caption font-medium text-brand backdrop-blur">
            {template.isNew ? "New" : "Featured"}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span className="text-caption capitalize text-ink-muted">{template.category}</span>
          <span className="text-ink-muted" aria-hidden="true">·</span>
          <span className="text-caption capitalize text-ink-muted">{template.difficulty}</span>
        </div>

        <h3 className="mt-2 text-body font-semibold text-ink">
          {/* The whole card is the click target via this stretched link,
              which keeps one accessible link per card rather than making a
              <div> clickable. */}
          <Link href={`/dashboard/templates/${template.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {template.name}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-3 flex-1 text-small leading-relaxed text-ink-secondary">{template.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded border border-line bg-canvas-subtle px-1.5 py-0.5 text-caption text-ink-muted">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-2">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="btn btn-secondary btn-sm disabled:opacity-45"
      >
        Previous
      </button>
      <span aria-live="polite" className="px-2 text-caption tabular-nums text-ink-secondary">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="btn btn-secondary btn-sm disabled:opacity-45"
      >
        Next
      </button>
    </nav>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<SkeletonCardGrid count={6} />}>
      <TemplatesBrowser />
    </Suspense>
  );
}
