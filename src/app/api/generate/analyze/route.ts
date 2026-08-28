import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdaptiveQuestions } from "@/lib/prompt-engineer";

/**
 * The AI Prompt Engineer step. Deliberately NOT credit-gated and NOT a
 * Gemini call — getAdaptiveQuestions() is pure deterministic keyword
 * classification (see lib/prompt-engineer.ts), so this route costs
 * nothing to run and is available on every tier, including Free.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { description } = (await req.json()) as { description: string };
  if (!description || description.trim().length < 5) {
    return NextResponse.json({ error: "Tell us a bit more about your app first." }, { status: 400 });
  }

  const { category, questions } = getAdaptiveQuestions(description);
  return NextResponse.json({ detectedCategory: category, questions });
}
