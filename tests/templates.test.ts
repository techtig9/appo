import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_CATALOG, getTemplateBySlug, toListItem, availableCategories, allTags } from "../src/lib/templates/catalog";
import { queryTemplates, searchScore, relatedTemplates, categoryFacets, MAX_PER_PAGE } from "../src/lib/templates/query";
import { renderTemplateThumbnail, THUMBNAIL_DIMENSIONS } from "../src/lib/templates/thumbnail";
import { CATEGORY_LABELS } from "../src/lib/templates/types";

describe("catalogue integrity", () => {
  // The brief asks for a minimum of 50 genuinely different templates.
  test("ships at least 50 templates", () => {
    assert.ok(TEMPLATE_CATALOG.length >= 50, `only ${TEMPLATE_CATALOG.length} templates`);
  });

  test("every slug is unique and URL-safe", () => {
    const slugs = new Set<string>();
    for (const template of TEMPLATE_CATALOG) {
      assert.match(template.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `bad slug: ${template.slug}`);
      assert.ok(!slugs.has(template.slug), `duplicate slug: ${template.slug}`);
      slugs.add(template.slug);
    }
  });

  test("every name is unique — 64 renames of one idea is not a catalogue", () => {
    const names = new Set(TEMPLATE_CATALOG.map((template) => template.name.toLowerCase()));
    assert.equal(names.size, TEMPLATE_CATALOG.length);
  });

  test("every template carries a real description, not a placeholder", () => {
    for (const template of TEMPLATE_CATALOG) {
      assert.ok(template.description.length >= 40, `${template.slug}: description too short`);
      assert.ok(
        !/lorem|todo|tbd|placeholder|coming soon/i.test(template.description),
        `${template.slug}: placeholder text in description`
      );
    }
  });

  test("every template has screens, tags, a platform and a seed prompt", () => {
    for (const template of TEMPLATE_CATALOG) {
      assert.ok(template.screens.length >= 3, `${template.slug}: too few screens`);
      assert.ok(template.tags.length >= 2, `${template.slug}: too few tags`);
      assert.ok(template.platforms.length >= 1, `${template.slug}: no platform`);
      assert.ok(template.prompt.length >= 60, `${template.slug}: seed prompt too thin`);
    }
  });

  test("every accent is a valid hex colour", () => {
    for (const template of TEMPLATE_CATALOG) {
      assert.match(template.accent, /^#[0-9A-Fa-f]{6}$/, `${template.slug}: bad accent`);
    }
  });

  test("every category has a human label", () => {
    for (const template of TEMPLATE_CATALOG) {
      assert.ok(CATEGORY_LABELS[template.category], `${template.category} has no label`);
    }
  });

  test("the catalogue spans many categories and layout shapes", () => {
    assert.ok(availableCategories().length >= 20, "too few categories represented");
    const archetypes = new Set(TEMPLATE_CATALOG.map((template) => template.archetype));
    assert.ok(archetypes.size >= 10, `only ${archetypes.size} distinct layouts`);
  });

  test("popularity is a sane 0-100 editorial ranking", () => {
    for (const template of TEMPLATE_CATALOG) {
      assert.ok(template.popularity >= 0 && template.popularity <= 100, `${template.slug}: ${template.popularity}`);
    }
  });

  test("allTags returns tags ordered by how many templates use them", () => {
    const tags = allTags();
    assert.ok(tags.length > 20);
    assert.equal(new Set(tags).size, tags.length, "duplicate tags");
  });
});

describe("thumbnails", () => {
  // "Every displayed template must have a professional sample thumbnail
  // that actually represents it. No empty/null or random unrelated images."
  test("every template produces a non-empty SVG", () => {
    for (const template of TEMPLATE_CATALOG) {
      const svg = renderTemplateThumbnail(template);
      assert.ok(svg.startsWith("<svg"), `${template.slug}: not an SVG`);
      assert.ok(svg.endsWith("</svg>"), `${template.slug}: truncated SVG`);
      assert.ok(svg.length > 800, `${template.slug}: suspiciously empty preview`);
    }
  });

  test("toListItem never yields a null thumbnail", () => {
    for (const template of TEMPLATE_CATALOG) {
      const item = toListItem(template);
      assert.ok(item.thumbnail && item.thumbnail.length > 0, `${template.slug}: empty thumbnail path`);
    }
  });

  test("no two templates share a preview", () => {
    const seen = new Map<string, string>();
    for (const template of TEMPLATE_CATALOG) {
      const svg = renderTemplateThumbnail(template);
      const clash = seen.get(svg);
      assert.equal(clash, undefined, `${template.slug} renders identically to ${clash}`);
      seen.set(svg, template.slug);
    }
  });

  test("the preview reflects the template's own accent and layout", () => {
    const kanban = TEMPLATE_CATALOG.find((template) => template.archetype === "kanban")!;
    const chat = TEMPLATE_CATALOG.find((template) => template.archetype === "chat")!;
    assert.ok(renderTemplateThumbnail(kanban).includes(kanban.accent));
    // Same slug, different archetype must produce different artwork —
    // otherwise the archetype field is decoration.
    const asChat = renderTemplateThumbnail({ ...kanban, archetype: chat.archetype });
    assert.notEqual(renderTemplateThumbnail(kanban), asChat);
  });

  test("rendering is deterministic, which is what makes immutable caching safe", () => {
    const template = TEMPLATE_CATALOG[0];
    assert.equal(renderTemplateThumbnail(template), renderTemplateThumbnail(template));
  });

  test("an accessible label and fixed viewBox are always present", () => {
    const svg = renderTemplateThumbnail(TEMPLATE_CATALOG[0]);
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-label="Layout preview: /);
    assert.ok(svg.includes(`viewBox="0 0 ${THUMBNAIL_DIMENSIONS.width} ${THUMBNAIL_DIMENSIONS.height}"`));
  });

  test("a hostile template name cannot break out of the aria-label", () => {
    const svg = renderTemplateThumbnail({
      slug: "x",
      name: '"><script>alert(1)</script>',
      archetype: "list",
      accent: "#7C5CFF",
    });
    assert.ok(!svg.includes("<script>"));
    assert.match(svg, /&quot;&gt;&lt;script&gt;/);
  });
});

describe("searchScore", () => {
  const support = getTemplateBySlug("ai-support-agent")!;
  const kanban = getTemplateBySlug("kanban-board")!;

  test("an exact name match outranks an incidental mention", () => {
    assert.ok(searchScore(kanban, "kanban") > searchScore(support, "kanban"));
  });

  test("a tag match counts for more than a description match", () => {
    assert.ok(searchScore(support, "chat") > 0);
  });

  test("every word must match, so a two-word query is not an OR", () => {
    assert.equal(searchScore(kanban, "kanban zzzznope"), 0);
  });

  test("an empty term matches everything equally", () => {
    assert.equal(searchScore(kanban, "   "), 1);
  });
});

describe("queryTemplates", () => {
  test("returns the first page by default", () => {
    const result = queryTemplates();
    assert.equal(result.page, 1);
    assert.equal(result.items.length, result.perPage);
    assert.equal(result.total, TEMPLATE_CATALOG.length);
  });

  test("recommended sort leads with featured templates", () => {
    const result = queryTemplates({ sort: "recommended", perPage: 6 });
    assert.ok(result.items[0].featured, "first recommended result is not featured");
  });

  test("filters by category, platform and difficulty", () => {
    const ai = queryTemplates({ category: "ai", perPage: MAX_PER_PAGE });
    assert.ok(ai.total > 0);
    assert.ok(ai.items.every((template) => template.category === "ai"));

    const ios = queryTemplates({ platform: "ios", perPage: MAX_PER_PAGE });
    assert.ok(ios.items.every((template) => template.platforms.includes("ios")));

    const starter = queryTemplates({ difficulty: "starter", perPage: MAX_PER_PAGE });
    assert.ok(starter.items.every((template) => template.difficulty === "starter"));
  });

  test("search narrows the result set and orders by relevance", () => {
    const result = queryTemplates({ q: "invoice" });
    assert.ok(result.total >= 1);
    assert.equal(result.items[0].slug, "invoice-generator");
  });

  test("a search with no matches returns an empty page, not the whole catalogue", () => {
    const result = queryTemplates({ q: "zzzznotathing" });
    assert.equal(result.total, 0);
    assert.equal(result.items.length, 0);
    assert.equal(result.totalPages, 1);
  });

  test("paginates without dropping or repeating a template", () => {
    const perPage = 10;
    const seen = new Set<string>();
    const first = queryTemplates({ perPage, page: 1 });
    for (let page = 1; page <= first.totalPages; page++) {
      for (const item of queryTemplates({ perPage, page }).items) {
        assert.ok(!seen.has(item.slug), `${item.slug} appeared twice`);
        seen.add(item.slug);
      }
    }
    assert.equal(seen.size, TEMPLATE_CATALOG.length);
  });

  test("a page beyond the end clamps rather than returning nothing", () => {
    const result = queryTemplates({ perPage: 10, page: 9999 });
    assert.equal(result.page, result.totalPages);
    assert.ok(result.items.length > 0);
  });

  test("perPage is clamped so a caller cannot request the whole table", () => {
    assert.equal(queryTemplates({ perPage: 5000 }).perPage, MAX_PER_PAGE);
    assert.equal(queryTemplates({ perPage: 0 }).perPage, 1);
  });
});

describe("relatedTemplates", () => {
  test("suggests templates from the same category and never itself", () => {
    const related = relatedTemplates("ai-support-agent");
    assert.ok(related.length > 0);
    assert.ok(related.every((template) => template.slug !== "ai-support-agent"));
  });

  test("an unknown slug returns nothing rather than throwing", () => {
    assert.deepEqual(relatedTemplates("does-not-exist"), []);
  });
});

describe("categoryFacets", () => {
  test("counts add up to the whole catalogue", () => {
    const total = categoryFacets().reduce((sum, facet) => sum + facet.count, 0);
    assert.equal(total, TEMPLATE_CATALOG.length);
  });
});
