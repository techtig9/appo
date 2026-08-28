import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lastNDates } from "@/lib/analytics";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: apps, error: appsError } = await supabase.from("apps").select("id, name, platforms, created_at, is_favorite").eq("user_id", user.id).order("created_at", { ascending: false });
  if (appsError) return NextResponse.json({ error: "Couldn't load analytics." }, { status: 500 });
  const appIds = (apps ?? []).map(a => a.id);

  const [{ data: versions }, { data: deployments }, { data: subscription }] = await Promise.all([
    appIds.length ? supabase.from("app_versions").select("id, app_id, created_at").in("app_id", appIds) : Promise.resolve({ data: [] as { id: string; app_id: string; created_at: string | null }[] }),
    appIds.length ? supabase.from("deployments").select("id, app_id, platform, status, is_current, released_at").in("app_id", appIds) : Promise.resolve({ data: [] as { id: string; app_id: string; platform: string; status: string; is_current: boolean; released_at: string | null }[] }),
    supabase.from("subscriptions").select("plan, credits_remaining, credits_granted").eq("user_id", user.id).single(),
  ]);

  const dates = lastNDates(14);
  const byDate = new Map(dates.map(d => [d, { date: d, apps: 0, versions: 0, deployments: 0 }]));
  for (const a of apps ?? []) { const key = (a.created_at ?? "").slice(0, 10); if (byDate.has(key)) byDate.get(key)!.apps++; }
  for (const v of versions ?? []) { const key = (v.created_at ?? "").slice(0, 10); if (byDate.has(key)) byDate.get(key)!.versions++; }
  for (const d of deployments ?? []) { const key = (d.released_at ?? "").slice(0, 10); if (byDate.has(key)) byDate.get(key)!.deployments++; }

  const platformCounts = new Map<string, number>();
  for (const app of apps ?? []) for (const platform of app.platforms ?? []) platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  const deploymentStatus = new Map<string, number>();
  for (const d of deployments ?? []) deploymentStatus.set(d.status ?? "unknown", (deploymentStatus.get(d.status ?? "unknown") ?? 0) + 1);
  const creditsGranted = subscription?.credits_granted ?? 0;
  const creditsRemaining = subscription?.credits_remaining ?? 0;

  return NextResponse.json({
    summary: {
      apps: apps?.length ?? 0,
      versions: versions?.length ?? 0,
      deployments: deployments?.length ?? 0,
      liveDeployments: (deployments ?? []).filter(d => d.is_current && d.status === "live").length,
      favoriteApps: (apps ?? []).filter(a => a.is_favorite).length,
      creditsUsed: Math.max(0, creditsGranted - creditsRemaining),
      creditsRemaining,
      creditsGranted,
      plan: subscription?.plan ?? "free",
    },
    series: Array.from(byDate.values()),
    platforms: Array.from(platformCounts.entries()).map(([name, value]) => ({ name, value })),
    deploymentStatus: Array.from(deploymentStatus.entries()).map(([name, value]) => ({ name, value })),
    recentApps: (apps ?? []).slice(0, 6),
  });
}
