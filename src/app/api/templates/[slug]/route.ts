import { createClient } from "@/lib/supabase/server";
import { apiError, apiOk } from "@/lib/api/responses";
import { getTemplateBySlug, toListItem } from "@/lib/templates/catalog";
import { relatedTemplates } from "@/lib/templates/query";
import { CATEGORY_LABELS } from "@/lib/templates/types";

export const dynamic = "force-dynamic";

/**
 * A single catalogue template, plus what the builder needs to start from
 * it. `generatorSeed` is the exact payload the AI Builder pre-fills — the
 * user reviews and edits it before spending any credits, rather than the
 * template silently launching a generation on their behalf.
 */
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to view this template.");

  const template = getTemplateBySlug(params.slug);
  if (!template) return apiError("not_found", "That template doesn't exist.");

  return apiOk({
    template: {
      ...toListItem(template),
      categoryLabel: CATEGORY_LABELS[template.category] ?? template.category,
    },
    related: relatedTemplates(template.slug),
    generatorSeed: {
      name: template.name,
      description: template.prompt,
      answers: {
        platforms: template.platforms,
        coreScreens: template.screens,
        // Screen-heavy templates read better with tabs; a short flow with
        // a detail view is a stack. Chosen from the template's own shape
        // rather than defaulted to the same value for all 64.
        navigationPattern:
          template.archetype === "dashboard" || template.archetype === "kanban"
            ? "drawer"
            : template.screens.length > 3
              ? "tabs"
              : "stack",
        needsBackend: template.difficulty !== "starter",
        colorTheme: template.accent,
        authentication: template.difficulty === "starter" ? "none" : "email_google",
        database: template.difficulty === "starter" ? "none" : "postgresql",
        apiStyle: template.difficulty === "starter" ? "none" : "rest",
        fileStorage: template.tags.includes("images") || template.tags.includes("documents") || template.tags.includes("video"),
      },
    },
  });
}
