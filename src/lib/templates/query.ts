import { TEMPLATE_CATALOG, toListItem } from "./catalog";
import type { TemplateDefinition, TemplateListItem } from "./types";

/**
 * Search, filter and sort over the catalogue.
 *
 * Pure and synchronous — the catalogue is 64 objects in memory, so
 * filtering it in Node is faster than a round trip, and it keeps the
 * marketplace's behaviour fully testable without a database.
 */

export type TemplateSort = "recommended" | "popular" | "newest" | "name";

export interface TemplateQuery {
  q?: string;
  category?: string;
  tag?: string;
  platform?: string;
  difficulty?: string;
  featured?: boolean;
  sort?: TemplateSort;
  page?: number;
  perPage?: number;
}

export interface TemplateQueryResult {
  items: TemplateListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const DEFAULT_PER_PAGE = 12;
export const MAX_PER_PAGE = 48;

/**
 * Scores a template against a search term. Deliberately weighted rather
 * than a flat `includes`: someone typing "chat" should get the AI Support
 * Agent (name and tag) above a template that merely mentions chat in a
 * sentence.
 */
export function searchScore(template: TemplateDefinition, term: string): number {
  const needle = term.trim().toLowerCase();
  if (!needle) return 1;

  const name = template.name.toLowerCase();
  const words = needle.split(/\s+/).filter(Boolean);

  let score = 0;
  for (const word of words) {
    let wordScore = 0;
    if (name === word) wordScore += 100;
    else if (name.startsWith(word)) wordScore += 60;
    else if (name.includes(word)) wordScore += 40;

    if (template.slug.includes(word)) wordScore += 25;
    if (template.category.includes(word)) wordScore += 20;
    if (template.tags.some((tag) => tag === word)) wordScore += 30;
    else if (template.tags.some((tag) => tag.includes(word))) wordScore += 12;
    if (template.description.toLowerCase().includes(word)) wordScore += 8;
    if (template.screens.some((screen) => screen.toLowerCase().includes(word))) wordScore += 6;

    // Every word must contribute something, so "ai chat" does not match a
    // template that only satisfies "ai".
    if (wordScore === 0) return 0;
    score += wordScore;
  }
  return score;
}

function matchesFilters(template: TemplateDefinition, query: TemplateQuery): boolean {
  if (query.category && query.category !== "all" && template.category !== query.category) return false;
  if (query.tag && !template.tags.includes(query.tag)) return false;
  if (query.platform && query.platform !== "all" && !template.platforms.includes(query.platform as never)) return false;
  if (query.difficulty && query.difficulty !== "all" && template.difficulty !== query.difficulty) return false;
  if (query.featured && !template.featured) return false;
  return true;
}

const SORTERS: Record<TemplateSort, (a: TemplateDefinition, b: TemplateDefinition) => number> = {
  // "Recommended" leads with featured, then popularity — the default a
  // first-time visitor sees.
  recommended: (a, b) =>
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    b.popularity - a.popularity ||
    a.name.localeCompare(b.name),
  popular: (a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name),
  newest: (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
};

export function queryTemplates(query: TemplateQuery = {}): TemplateQueryResult {
  const perPage = Math.min(Math.max(query.perPage ?? DEFAULT_PER_PAGE, 1), MAX_PER_PAGE);
  const page = Math.max(query.page ?? 1, 1);
  const term = query.q?.trim() ?? "";

  let matched = TEMPLATE_CATALOG.filter((template) => matchesFilters(template, query));

  if (term) {
    const scored = matched
      .map((template) => ({ template, score: searchScore(template, term) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.template.name.localeCompare(b.template.name));
    matched = scored.map((entry) => entry.template);
  } else {
    matched = [...matched].sort(SORTERS[query.sort ?? "recommended"]);
  }

  // A search term already orders by relevance; an explicit sort still wins
  // if the user picked one.
  if (term && query.sort && query.sort !== "recommended") {
    matched = [...matched].sort(SORTERS[query.sort]);
  }

  const total = matched.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (Math.min(page, totalPages) - 1) * perPage;

  return {
    items: matched.slice(start, start + perPage).map(toListItem),
    total,
    page: Math.min(page, totalPages),
    perPage,
    totalPages,
  };
}

/** Category facets with counts, so empty filters can be hidden or disabled. */
export function categoryFacets(): { category: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const template of TEMPLATE_CATALOG) {
    counts.set(template.category, (counts.get(template.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

/**
 * Templates related to a given one — same category first, then shared
 * tags. Used on the detail page so a dead end always offers a next step.
 */
export function relatedTemplates(slug: string, limit = 3): TemplateListItem[] {
  const source = TEMPLATE_CATALOG.find((template) => template.slug === slug);
  if (!source) return [];

  return TEMPLATE_CATALOG.filter((template) => template.slug !== slug)
    .map((template) => {
      const sharedTags = template.tags.filter((tag) => source.tags.includes(tag)).length;
      const sameCategory = template.category === source.category ? 3 : 0;
      const sameArchetype = template.archetype === source.archetype ? 1 : 0;
      return { template, score: sameCategory + sharedTags * 2 + sameArchetype };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.template.popularity - a.template.popularity)
    .slice(0, limit)
    .map((entry) => toListItem(entry.template));
}
