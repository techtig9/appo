import { renderTemplateThumbnail } from "@/lib/templates/thumbnail";
import type { TemplateArchetype } from "@/lib/templates/types";

/**
 * Preview image for a community template (a user-published app).
 *
 * Appo has never run these apps, so there is no screenshot to show and
 * inventing one would be a fabrication. Instead the same wireframe
 * generator produces a neutral, deterministic preview keyed on the app's
 * id — the marketplace requirement is that a card is never blank and
 * never shows an unrelated image, and this satisfies both honestly.
 */

const ARCHETYPES: TemplateArchetype[] = ["dashboard", "list", "feed", "gallery", "table", "storefront"];
const ACCENTS = ["#7C5CFF", "#5B7CFF", "#A855F7", "#38BDF8", "#22C55E", "#F59E0B"];

function pick<T>(values: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return values[hash % values.length];
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  // The id comes from the URL, so it is treated purely as a hash seed and
  // never interpolated into the output.
  const seed = params.id.replace(/[^A-Za-z0-9-]/g, "").slice(0, 64) || "community";

  const svg = renderTemplateThumbnail({
    slug: seed,
    name: "Community template",
    archetype: pick(ARCHETYPES, seed),
    accent: pick(ACCENTS, seed),
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
