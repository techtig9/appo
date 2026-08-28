export interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
}

export interface OnboardingProgress {
  steps: OnboardingStep[];
  allDone: boolean;
}

/**
 * Derives onboarding progress from data that already exists, rather than
 * tracking each step's completion in its own column — an app row existing
 * IS proof the user generated one, so there's nothing separate to keep in
 * sync or get stale.
 */
export function computeOnboardingProgress(appCount: number, hasExportedOrDeployed: boolean): OnboardingProgress {
  const steps: OnboardingStep[] = [
    { id: "describe", label: "Describe your first app idea", done: appCount > 0 },
    { id: "generate", label: "Generate it with the AI Prompt Engineer", done: appCount > 0 },
    { id: "export", label: "Export or deploy your first app", done: hasExportedOrDeployed },
  ];

  return { steps, allDone: steps.every((s) => s.done) };
}
