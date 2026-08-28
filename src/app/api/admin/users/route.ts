import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = createServiceRoleClient();
  const { data: users } = await supabase.from("users").select("*, subscriptions(plan, status, credits_remaining)");

  return NextResponse.json({ users });
}
