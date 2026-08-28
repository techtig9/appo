import type { PlanId } from "./supabase/types";

export type FeatureKey =
  | "voiceInput"
  | "importExistingApp"
  | "codeExport"
  | "deployWeb"
  | "buildAppStore"
  | "buildPlayStore"
  | "customAppIcon"
  | "versionHistory"
  | "publicTemplateGallery"
  | "customSubdomain"
  | "cloneApp"
  | "githubExport"
  | "usageAnalytics"
  | "webhookNotifications"
  | "shareablePreviewLink"
  | "teamCollaboration";

export interface PlanDefinition {
  id: PlanId;
  label: string;
  priceMonthlyCents: number; // 0 for Free
  monthlyCredits: number;
  features: Record<FeatureKey, boolean>;
}

/**
 * Matches "Subscription Plans" table in Pricing_Plans_&_Cost_Optimisation_Strategy
 * (as merged into the appo build command). Update this file first if pricing
 * changes — every other module reads from here, nothing hardcodes numbers elsewhere.
 *
 * Credit levels below were raised from an earlier pass after checking real
 * Gemini 3.6 Flash pricing ($1.50/$7.50 per million input/output tokens):
 * one full generateFullApp (1,500 credits) costs roughly $0.04 in actual
 * API spend. Even generous credit allowances keep every paid plan's
 * worst-case Gemini cost under 5% of its price — comfortably inside the
 * 60-70% margin target with room for Supabase/Paddle overhead. Free was
 * previously 150 credits, which couldn't cover a single 1,500-credit
 * generation — a free user could never actually see a generated app,
 * which is the product's entire activation moment. Fixed below.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    label: "Free",
    priceMonthlyCents: 0,
    monthlyCredits: 2000,
    features: {
      voiceInput: false,
      importExistingApp: false,
      codeExport: false,
      deployWeb: false,
      buildAppStore: false,
      buildPlayStore: false,
      customAppIcon: false,
      versionHistory: false,
      publicTemplateGallery: false,
      customSubdomain: false,
      cloneApp: false,
      githubExport: false,
      usageAnalytics: false,
      webhookNotifications: false,
      shareablePreviewLink: false,
      teamCollaboration: false,
    },
  },
  starter: {
    id: "starter",
    label: "Starter",
    priceMonthlyCents: 1400,
    monthlyCredits: 12000,
    features: {
      voiceInput: true,
      importExistingApp: true,
      codeExport: true,
      deployWeb: true,
      buildAppStore: true,
      buildPlayStore: true,
      customAppIcon: true,
      versionHistory: false,
      publicTemplateGallery: false,
      customSubdomain: false,
      cloneApp: true,
      githubExport: false,
      usageAnalytics: true,
      webhookNotifications: false,
      shareablePreviewLink: false,
      teamCollaboration: false,
    },
  },
  pro: {
    id: "pro",
    label: "Pro",
    priceMonthlyCents: 2900,
    monthlyCredits: 40000,
    features: {
      voiceInput: true,
      importExistingApp: true,
      codeExport: true,
      deployWeb: true,
      buildAppStore: true,
      buildPlayStore: true,
      customAppIcon: true,
      versionHistory: true,
      publicTemplateGallery: true,
      customSubdomain: false,
      cloneApp: true,
      githubExport: true,
      usageAnalytics: true,
      webhookNotifications: true,
      shareablePreviewLink: true,
      teamCollaboration: true,
    },
  },
  business: {
    id: "business",
    label: "Business",
    priceMonthlyCents: 5900,
    monthlyCredits: 90000,
    features: {
      voiceInput: true,
      importExistingApp: true,
      codeExport: true,
      deployWeb: true,
      buildAppStore: true,
      buildPlayStore: true,
      customAppIcon: true,
      versionHistory: true,
      publicTemplateGallery: true,
      customSubdomain: true,
      cloneApp: true,
      githubExport: true,
      usageAnalytics: true,
      webhookNotifications: true,
      shareablePreviewLink: true,
      teamCollaboration: true,
    },
  },
};

/**
 * Internal credit cost reference (Engineering only — never surfaced in
 * customer-facing pricing UI; see the build command's Appendix).
 */
export const CREDIT_COSTS = {
  generateFullApp: 1500,
  importAndExtendApp: 1800,
  regenerateCompleteApp: 400,
  generateNewScreen: 250,
  generateNewComponent: 100,
  changeTheme: 50,
  updateExistingScreen: 100,
  buildIosOrAndroid: 200,
  submitAppStore: 300,
  submitPlayStore: 200,
  voiceTranscription: 50,
  exportCode: 0,
  deployWebVersion: 0,
  cloneApp: 0, // DB copy, not a generation — zero-cost value-add
  githubExport: 0, // GitHub API push of existing code — zero-cost value-add
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export function getPlan(planId: PlanId): PlanDefinition {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan id: ${planId}`);
  return plan;
}
