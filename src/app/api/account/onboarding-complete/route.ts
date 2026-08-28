import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Service-role write — same reasoning as /api/account/profile: `users`
  // has no UPDATE policy for the authenticated role at all under RLS.
  const admin = createServiceRoleClient();
  await admin.from("users").update({ onboarding_completed: true }).eq("id", user.id);
  return NextResponse.json({ onboarding_completed: true });
}
