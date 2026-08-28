import { PLANS } from "@/lib/plans";
import { approximateMonthlyAppCapacity } from "@/lib/credits";

const PLAN_ORDER: (keyof typeof PLANS)[] = ["free", "starter", "pro", "business"];
const PLAN_EMOJI: Record<string, string> = { free: "🆓", starter: "🚀", pro: "⭐", business: "💼" };

/**
 * Renders straight from PLANS (src/lib/plans.ts) so the pricing page can
 * never silently drift from the numbers backing the credit-gating logic —
 * there is exactly one place pricing is defined in this codebase.
 */
export function PricingTable() {
  return (
    <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-16 md:grid-cols-4">
      {PLAN_ORDER.map((id) => {
        const plan = PLANS[id];
        const isFree = plan.priceMonthlyCents === 0;
        return (
          <div key={id} className="glass-card fade-in flex flex-col gap-4 p-8">
            <div className="text-3xl">{PLAN_EMOJI[id]}</div>
            <h3 className="text-xl font-semibold">{plan.label}</h3>
            <p className="text-3xl font-bold">
              {isFree ? "Free" : `$${(plan.priceMonthlyCents / 100).toFixed(0)}`}
              {!isFree && <span className="text-base font-normal text-slate-400">/mo</span>}
            </p>
            <p className="text-sm text-slate-400">
              {plan.monthlyCredits.toLocaleString()} credits/mo · ~{approximateMonthlyAppCapacity(id)}{" "}
              {isFree ? "app to try free" : "apps/mo"}
            </p>
            <ul className="flex-1 space-y-2 text-sm text-slate-300">
              {Object.entries(plan.features)
                .filter(([, enabled]) => enabled)
                .map(([feature]) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-violet">✓</span>
                    {humanizeFeatureKey(feature)}
                  </li>
                ))}
            </ul>
            <button className="btn-accent w-full">{isFree ? "Get Started" : "Choose Plan"}</button>
          </div>
        );
      })}
    </section>
  );
}

function humanizeFeatureKey(key: string): string {
  const labels: Record<string, string> = {
    voiceInput: "Voice input",
    importExistingApp: "Import existing app (GitHub/ZIP)",
    codeExport: "Code export (ZIP)",
    deployWeb: "Deploy web app",
    buildAppStore: "Build/submit to App Store",
    buildPlayStore: "Build/submit to Play Store",
    customAppIcon: "Custom app icon & splash screen",
    versionHistory: "Version history & rollback",
    publicTemplateGallery: "Publish to template gallery",
    customSubdomain: "Custom web subdomain",
    cloneApp: "Clone / duplicate app",
    githubExport: "One-click GitHub export",
    usageAnalytics: "Usage analytics dashboard",
    webhookNotifications: "Build/deploy webhook notifications",
  };
  return labels[key] ?? key;
}
