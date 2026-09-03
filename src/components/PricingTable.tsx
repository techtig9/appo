import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { approximateMonthlyAppCapacity } from "@/lib/credits";
import { cn } from "@/components/ui/cn";
import type { PlanId } from "@/lib/supabase/types";

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "business"];

/** One line per plan explaining who it is actually for. */
const PLAN_PITCH: Record<PlanId, string> = {
  free: "Try a full generation and see the output before deciding anything.",
  starter: "For one person shipping side projects and client prototypes.",
  pro: "For teams that need version history, collaboration and GitHub.",
  business: "For agencies running several client projects at once.",
};

/**
 * Renders straight from PLANS (src/lib/plans.ts) so the pricing page can
 * never silently drift from the numbers backing the credit-gating logic —
 * there is exactly one place pricing is defined in this codebase.
 *
 * Two problems fixed here: the plan buttons were `<button>` elements with
 * no handler at all (they looked like a purchase path and did nothing),
 * and every plan listed its entire enabled feature set, which made Business
 * a wall of sixteen ticks nobody reads. Each tier now shows what it adds
 * over the one below it.
 */
export function PricingTable() {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_ORDER.map((id, index) => {
        const plan = PLANS[id];
        const isFree = plan.priceMonthlyCents === 0;
        // Pro is the plan most teams should be on, so it is marked — one
        // highlighted tier, not a badge on every card.
        const highlighted = id === "pro";
        const previous = index > 0 ? PLANS[PLAN_ORDER[index - 1]] : null;
        const added = newFeaturesVersus(plan.features, previous?.features ?? null);

        return (
          <div
            key={id}
            className={cn(
              "card flex flex-col p-5",
              highlighted && "card-featured relative lg:-my-2 lg:py-7"
            )}
          >
            {highlighted ? (
              <span className="absolute -top-2.5 left-5 rounded-full bg-brand px-2.5 py-0.5 text-caption font-medium text-brand-contrast">
                Most popular
              </span>
            ) : null}

            <h3 className="text-body font-semibold text-ink">{plan.label}</h3>
            <p className="mt-1 text-caption leading-relaxed text-ink-secondary">{PLAN_PITCH[id]}</p>

            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-page font-semibold tracking-tight text-ink">
                {isFree ? "Free" : `$${(plan.priceMonthlyCents / 100).toFixed(0)}`}
              </span>
              {!isFree ? <span className="text-small text-ink-muted">/month</span> : null}
            </p>

            <p className="mt-2 text-caption text-ink-secondary">
              <span className="font-medium text-ink">{plan.monthlyCredits.toLocaleString("en-GB")}</span> credits a month
              <span className="block text-ink-muted">
                {/* Derived from monthlyCredits / generateFullApp, so it can
                    never drift from the real cost of a generation. */}
                about {approximateMonthlyAppCapacity(id)} full {approximateMonthlyAppCapacity(id) === 1 ? "app" : "apps"}
              </span>
            </p>

            <ul className="mt-5 flex-1 space-y-2">
              {previous ? (
                <li className="text-caption font-medium text-ink-secondary">Everything in {previous.label}, plus:</li>
              ) : null}
              {added.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-caption leading-relaxed text-ink-secondary">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
                    <path d="m5 12.5 4 4 10-10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {humanizeFeatureKey(feature)}
                </li>
              ))}
              {added.length === 0 ? (
                <li className="text-caption leading-relaxed text-ink-secondary">
                  Everything in {previous?.label}, with a larger monthly credit allowance.
                </li>
              ) : null}
            </ul>

            {/* Real destinations. Signed-out visitors sign up; the billing
                page is where a plan is actually chosen and paid for. */}
            <Link
              href={isFree ? "/signup" : `/dashboard/billing?plan=${id}`}
              className={cn(
                "mt-6 inline-flex h-10 items-center justify-center rounded-md px-4 text-small font-medium transition-colors duration-micro",
                highlighted || isFree
                  ? "bg-brand text-brand-contrast hover:bg-brand-hover"
                  : "border border-line bg-surface-raised text-ink hover:border-line-strong"
              )}
            >
              {isFree ? "Start free" : `Choose ${plan.label}`}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

/** Features this plan enables that the tier below it did not. */
function newFeaturesVersus(
  features: Record<string, boolean>,
  previous: Record<string, boolean> | null
): string[] {
  return Object.entries(features)
    .filter(([key, enabled]) => enabled && !previous?.[key])
    .map(([key]) => key);
}

export function humanizeFeatureKey(key: string): string {
  const LABELS: Record<string, string> = {
    voiceInput: "Voice input",
    importExistingApp: "Import an existing project",
    codeExport: "Full code export",
    deployWeb: "Web deployment",
    buildAppStore: "iOS build tracking",
    buildPlayStore: "Android build tracking",
    customAppIcon: "Custom app icon",
    versionHistory: "Version history and rollback",
    publicTemplateGallery: "Publish to the template gallery",
    customSubdomain: "Custom subdomain",
    cloneApp: "Duplicate a project",
    githubExport: "GitHub export",
    usageAnalytics: "Usage analytics",
    webhookNotifications: "Build and deploy webhooks",
    shareablePreviewLink: "Shareable preview links",
    teamCollaboration: "Team collaboration",
  };
  return LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}
