import { createClient } from "@/lib/supabase/server";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseSearchParams, z } from "@/lib/api/validation";
import { queryTemplates } from "@/lib/templates/query";
import { matchPages } from "@/lib/search/pages";

export const dynamic = "force-dynamic";

/**
 * Workspace search, behind the top-bar field and the command palette.
 *
 * The top-bar input previously had no handler at all — it looked like
 * search and did nothing. This is the endpoint that makes it real.
 *
 * Projects come through the user's own client so RLS scopes them; the
 * template catalogue is in-process. Nothing here reads another user's
 * data, and the search term is passed to PostgREST via `ilike` with the
 * `%` wildcards added server-side, so a term containing `%` or `,` cannot
 * change the shape of the filter.
 */

const querySchema = z.object({
  q: z.string().trim().min(1, "is required").max(120),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to search.");

  const parsed = parseSearchParams(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { q } = parsed.data;
  const limit = parsed.data.limit ?? 6;

  // PostgREST treats `,` and `*` specially inside a filter value. Escaping
  // them here keeps a search for "a,b" a literal search rather than a
  // malformed filter.
  const safeTerm = q.replace(/[%_,*()]/g, (character) => `\\${character}`);

  const { data: projects } = await supabase
    .from("apps")
    .select("id, name, folder, created_at")
    .eq("user_id", user.id)
    .ilike("name", `%${safeTerm}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  const templateResults = queryTemplates({ q, perPage: limit });

  return apiOk({
    query: q,
    results: {
      projects: (projects ?? []).map((row) => ({
        type: "project" as const,
        id: row.id,
        title: row.name,
        subtitle: row.folder ?? "Project",
        href: `/dashboard/apps/${row.id}`,
      })),
      templates: templateResults.items.map((template) => ({
        type: "template" as const,
        id: template.slug,
        title: template.name,
        subtitle: template.description.slice(0, 90),
        href: `/dashboard/templates/${template.slug}`,
      })),
      pages: matchPages(q, 4),
    },
  });
}
