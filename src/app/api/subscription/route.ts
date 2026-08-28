import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, credits_remaining, credits_granted, status")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({ subscription });
}
