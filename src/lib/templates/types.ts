/**
 * Template catalogue types.
 *
 * The catalogue is code, not database rows, for three reasons: it is
 * reviewable in a pull request, it cannot drift out of sync with the
 * thumbnails that are derived from it, and a new environment has a
 * populated marketplace with no seeding step. Community templates
 * (user-published apps) still come from the database and are merged at
 * read time.
 */

export type TemplateCategory =
  | "ai"
  | "saas"
  | "ecommerce"
  | "fitness"
  | "education"
  | "finance"
  | "healthcare"
  | "restaurant"
  | "booking"
  | "travel"
  | "social"
  | "productivity"
  | "crm"
  | "hr"
  | "realestate"
  | "marketplace"
  | "portfolio"
  | "events"
  | "delivery"
  | "logistics"
  | "community"
  | "media"
  | "analytics"
  | "support"
  | "project"
  | "inventory"
  | "pos"
  | "blog"
  | "lms"
  | "jobs"
  | "creator"
  | "landing";

export type TemplatePlatform = "web" | "ios" | "android";

export type TemplateDifficulty = "starter" | "intermediate" | "advanced";

/**
 * The layout family a template belongs to. This drives the generated
 * preview image, so a CRM shows a pipeline and a chat app shows a
 * conversation — the thumbnail actually represents the template rather
 * than being a random decorative graphic.
 */
export type TemplateArchetype =
  | "dashboard"
  | "feed"
  | "list"
  | "chat"
  | "kanban"
  | "storefront"
  | "calendar"
  | "profile"
  | "editor"
  | "map"
  | "gallery"
  | "landing"
  | "form"
  | "player"
  | "table";

export interface TemplateDefinition {
  /** Stable, URL-safe identifier. Never change one after release. */
  slug: string;
  name: string;
  /** One or two sentences describing what the generated app actually does. */
  description: string;
  category: TemplateCategory;
  tags: string[];
  platforms: TemplatePlatform[];
  difficulty: TemplateDifficulty;
  archetype: TemplateArchetype;
  /** Hex accent used by the generated preview. */
  accent: string;
  /** The screens Appo is prompted to build. Shown on the detail page. */
  screens: string[];
  /** Seed description handed to the generator when the template is used. */
  prompt: string;
  featured?: boolean;
  isNew?: boolean;
  /**
   * Relative interest, 0–100. Used only for the "Popular" sort. This is an
   * editorial ordering of the catalogue, not a usage statistic — real
   * usage counts come from the database and are labelled as such.
   */
  popularity: number;
}

export interface TemplateListItem extends TemplateDefinition {
  /** Path to the generated preview image. Never null. */
  thumbnail: string;
  source: "appo";
}

/** A user-published app surfaced in the community section. */
export interface CommunityTemplateItem {
  id: string;
  name: string;
  tags: string[];
  platforms: string[];
  createdAt: string | null;
  thumbnail: string;
  source: "community";
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  ai: "AI",
  saas: "SaaS",
  ecommerce: "E-commerce",
  fitness: "Fitness",
  education: "Education",
  finance: "Finance",
  healthcare: "Healthcare",
  restaurant: "Restaurant",
  booking: "Booking",
  travel: "Travel",
  social: "Social",
  productivity: "Productivity",
  crm: "CRM",
  hr: "HR",
  realestate: "Real estate",
  marketplace: "Marketplace",
  portfolio: "Portfolio",
  events: "Events",
  delivery: "Delivery",
  logistics: "Logistics",
  community: "Community",
  media: "Media",
  analytics: "Analytics",
  support: "Support",
  project: "Project management",
  inventory: "Inventory",
  pos: "Point of sale",
  blog: "Blog",
  lms: "LMS",
  jobs: "Job board",
  creator: "Creator",
  landing: "Landing page",
};
