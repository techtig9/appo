/**
 * The AI Prompt Engineer: after the user describes their app, this asks
 * DIFFERENT follow-up questions depending on what they described — the
 * same value a live conversational AI pass would give — but it's built as
 * deterministic keyword classification + a static question bank rather
 * than an extra LLM call. That's what keeps it a zero-cost addition: the
 * only AI provider call anywhere in this flow is still the single final
 * generation call in lib/ai-router.ts (see CREDIT_COSTS.generateFullApp in
 * plans.ts — unchanged), now fed a much richer, better-engineered prompt.
 */

export type AppCategory =
  | "ecommerce"
  | "fitness"
  | "social"
  | "productivity"
  | "booking"
  | "education"
  | "finance"
  | "general";

const CATEGORY_KEYWORDS: Record<Exclude<AppCategory, "general">, string[]> = {
  ecommerce: ["shop", "store", "sell", "product", "cart", "checkout", "marketplace", "ecommerce", "e-commerce"],
  fitness: ["workout", "fitness", "habit", "gym", "exercise", "run", "steps", "health tracker", "diet"],
  social: ["social", "chat", "friends", "feed", "follow", "profile", "community", "messaging", "dating"],
  productivity: ["task", "todo", "to-do", "notes", "productivity", "planner", "reminder", "organize", "project"],
  booking: ["book", "booking", "appointment", "reservation", "schedule", "slot", "calendar"],
  education: ["learn", "course", "student", "quiz", "flashcard", "tutor", "education", "school"],
  finance: ["budget", "expense", "invoice", "finance", "money", "payment", "wallet", "banking"],
};

export interface FollowUpQuestion {
  id: string;
  question: string;
  options: string[];
}

/**
 * Deterministic classifier — pure string matching, no network call, no
 * randomness, fully unit-testable. Falls back to "general" when nothing
 * matches, which still gets a solid, if more generic, question set below.
 */
export function classifyAppCategory(description: string): AppCategory {
  const text = description.toLowerCase();
  let best: AppCategory = "general";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [Exclude<AppCategory, "general">, string[]][]) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return best;
}

const BASE_QUESTIONS: FollowUpQuestion[] = [
  { id: "platforms", question: "Which platform(s) should this run on?", options: ["iOS", "Android", "Both", "Web too"] },
  { id: "navigation", question: "How should navigation feel?", options: ["Tabs", "Stack", "Drawer"] },
  { id: "backend", question: "Does it need accounts or a backend?", options: ["Yes", "No, local only"] },
];

/**
 * Category-specific questions layered ON TOP of the base questions above —
 * this is the part that makes the interview feel "different depending on
 * what the user described" instead of one generic form for every app.
 */
const CATEGORY_QUESTIONS: Record<AppCategory, FollowUpQuestion[]> = {
  ecommerce: [
    { id: "catalog_size", question: "Roughly how many products?", options: ["Under 20", "20–200", "200+"] },
    { id: "payments", question: "Take payments in-app?", options: ["Yes", "Not yet — browse only"] },
  ],
  fitness: [
    { id: "tracking_unit", question: "What should it track?", options: ["Workouts", "Habits/streaks", "Nutrition", "All of it"] },
    { id: "reminders", question: "Daily reminders?", options: ["Yes", "No"] },
  ],
  social: [
    { id: "content_type", question: "What do people share?", options: ["Photos/video", "Text posts", "Both"] },
    { id: "privacy", question: "Public or private by default?", options: ["Public", "Private/invite-only"] },
  ],
  productivity: [
    { id: "structure", question: "How should items be organized?", options: ["Simple list", "Projects/folders", "Kanban board"] },
    { id: "collaboration", question: "Shared with others, or personal only?", options: ["Personal only", "Shared/collaborative"] },
  ],
  booking: [
    { id: "resource_type", question: "What's being booked?", options: ["Appointments", "Tables/rooms", "Equipment/rentals"] },
    { id: "calendar_sync", question: "Sync with an external calendar?", options: ["Yes", "No"] },
  ],
  education: [
    { id: "content_format", question: "Main content format?", options: ["Video lessons", "Flashcards/quizzes", "Reading material"] },
    { id: "progress_tracking", question: "Track progress/scores?", options: ["Yes", "No"] },
  ],
  finance: [
    { id: "tracking_focus", question: "Main focus?", options: ["Budgeting", "Expense tracking", "Invoicing"] },
    { id: "bank_sync", question: "Connect to real bank accounts?", options: ["Yes (Phase 2)", "No — manual entry"] },
  ],
  general: [
    { id: "primary_action", question: "What's the one thing users do most?", options: ["Browse content", "Create/submit something", "Track something over time"] },
  ],
};

/**
 * Returns the full adaptive question set for a description: the fixed base
 * questions every app needs, PLUS the category-specific ones. This is what
 * the generator UI renders as a short conversational back-and-forth.
 */
export function getAdaptiveQuestions(description: string): { category: AppCategory; questions: FollowUpQuestion[] } {
  const category = classifyAppCategory(description);
  return { category, questions: [...BASE_QUESTIONS, ...CATEGORY_QUESTIONS[category]] };
}

/**
 * Takes the user's raw answers to the adaptive questions and folds them
 * into a single, well-engineered instruction block appended to the base
 * AI provider prompt in lib/ai-router.ts — this is the actual "prompt engineering"
 * payoff: a sharper, more specific brief produced from zero extra AI calls.
 */
export function buildEngineeredContext(category: AppCategory, answers: Record<string, string>): string {
  const lines = Object.entries(answers).map(([questionId, answer]) => `- ${questionId}: ${answer}`);
  return [
    `Detected app category: ${category}.`,
    `Additional professional-app requirements gathered from the user:`,
    ...lines,
    `Use these to make informed, specific design and structure decisions rather than generic defaults.`,
  ].join("\n");
}

export const __testables = { CATEGORY_KEYWORDS, BASE_QUESTIONS, CATEGORY_QUESTIONS };
