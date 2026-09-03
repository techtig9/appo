import { createClient } from "@/lib/supabase/server";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseSearchParams, z } from "@/lib/api/validation";
import { queryTemplates, categoryFacets, DEFAULT_PER_PAGE, MAX_PER_PAGE } from "@/lib/templates/query";
import { allTags } from "@/lib/templates/catalog";
import { CATEGORY_LABELS } from "@/lib/templates/types";
import type { CommunityTemplateItem } from "@/lib/templates/types";

export const dynamic = "force-dynamic";

/**
 * Template marketplace.
 *
 * Two sources, kept clearly separate in the response rather than merged
 * into one ambiguous list: Appo's own curated catalogue (code, in
 * lib/templates/catalog.ts) and community templates (apps their owners
 * published). They have different trust levels and different metadata, and
 * conflating them would mean showing a community app with a fabricated
 * category it never had.
 */

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(40).optional(),
  tag: z.string().trim().max(40).optional(),
  platform: z.enum(["all", "web", "ios", "android"]).optional(),
  difficulty: z.enum(["all", "starter", "intermediate", "advanced"]).optional(),
  featured: z.enum(["true", "false"]).optional(),
  sort: z.enum(["recommended", "popular", "newest", "name"]).optional(),
  page: z.coerce.number().int().min(1).max(200).optional(),
  perPage: z.coerce.number().int().min(1).max(MAX_PER_PAGE).optional(),
  include: z.enum(["all", "appo", "community"]).optional(),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to browse templates.");

  const parsed = parseSearchParams(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const params = parsed.data;

  const include = params.include ?? "all";

  const catalogue =
    include === "community"
      ? { items: [], total: 0, page: 1, perPage: DEFAULT_PER_PAGE, totalPages: 1 }
      : queryTemplates({
          q: params.q,
          category: params.category,
          tag: params.tag,
          platform: params.platform,
          difficulty: params.difficulty,
          featured: params.featured === "true",
          sort: params.sort,
          page: params.page,
          perPage: params.perPage,
        });

  let community: CommunityTemplateItem[] = [];

  if (include !== "appo") {
    // Read through the USER's client, not the service role: the RLS policy
    // "own apps or public templates" is what limits this to genuinely
    // published apps, so a bug here cannot expose a private project.
    let communityQuery = supabase
      .from("apps")
      .select("id, name, platforms, tags, created_at")
      .eq("is_public_template", true)
      .order("created_at", { ascending: false })
      .limit(24);

    if (params.q) communityQuery = communityQuery.ilike("name", `%${params.q}%`);
    if (params.category && params.category !== "all") {
      communityQuery = communityQuery.contains("tags", [params.category]);
    }

    const { data } = await communityQuery;
    community = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      tags: row.tags ?? [],
      platforms: row.platforms ?? ["web"],
      createdAt: row.created_at ?? null,
      // Community entries get a generic preview keyed on their id. It is
      // never null and never someone else's screenshot.
      thumbnail: `/api/templates/community/${row.id}/thumbnail`,
      source: "community" as const,
    }));
  }

  return apiOk({
    templates: catalogue.items,
    pagination: {
      total: catalogue.total,
      page: catalogue.page,
      perPage: catalogue.perPage,
      totalPages: catalogue.totalPages,
    },
    community,
    facets: {
      categories: categoryFacets().map((facet) => ({
        value: facet.category,
        label: CATEGORY_LABELS[facet.category as keyof typeof CATEGORY_LABELS] ?? facet.category,
        count: facet.count,
      })),
      tags: allTags().slice(0, 24),
    },
  });
}
