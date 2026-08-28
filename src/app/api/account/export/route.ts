import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Self-serve data export (GDPR/CCPA right to access — see Privacy Policy
 * §4). Returns everything tied to the user as a single JSON download;
 * intentionally excludes other users' data and internal fields like
 * Paddle customer IDs that aren't the user's own input.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [{ data: profile }, { data: subscription }, { data: apps }, { data: payments }] = await Promise.all([
    supabase.from("users").select("name, email, created_at").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, status, credits_remaining, renews_at").eq("user_id", user.id).single(),
    supabase.from("apps").select("name, platforms, version, folder, tags, created_at").eq("user_id", user.id),
    supabase.from("payments").select("amount, status, created_at").eq("user_id", user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile,
    subscription,
    apps,
    payments,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=appo-account-data.json",
    },
  });
}
