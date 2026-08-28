import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/supabase/types";

const PRICE_ENV: Record<Exclude<PlanId, "free">, string> = {
  starter: "PADDLE_PRICE_STARTER",
  pro: "PADDLE_PRICE_PRO",
  business: "PADDLE_PRICE_BUSINESS",
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const prices = Object.fromEntries(
    Object.entries(PRICE_ENV).map(([plan, envName]) => [plan, process.env[envName] ?? null])
  );

  return NextResponse.json({
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? null,
    environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ?? "sandbox",
    prices,
  });
}
