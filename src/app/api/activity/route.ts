import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { globalRateLimitStore, checkRateLimit } from "@/lib/rate-limit";

type ActivityItem = {
  id: string;
  type: "app" | "version" | "deployment" | "team";
  title: string;
  description: string;
  createdAt: string;
  appId?: string;
  appName?: string;
  status?: string;
};

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = checkRateLimit(globalRateLimitStore, `activity:${user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 });
  if (!limited.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  const { data: apps, error: appsError } = await supabase
    .from("apps")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (appsError) return NextResponse.json({ error: "Couldn't load activity." }, { status: 500 });

  const appIds = (apps ?? []).map((app) => app.id);
  const [{ data: versions }, { data: deployments }, { data: collaborators }] = await Promise.all([
    appIds.length ? supabase.from("app_versions").select("id, app_id, created_at").in("app_id", appIds).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] as { id: string; app_id: string; created_at: string | null }[] }),
    appIds.length ? supabase.from("deployments").select("id, app_id, platform, status, released_at, created_at").in("app_id", appIds).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] as { id: string; app_id: string; platform: string; status: string; released_at: string | null; created_at?: string | null }[] }),
    appIds.length ? supabase.from("app_collaborators").select("id, app_id, role, created_at").in("app_id", appIds).order("created_at", { ascending: false }).limit(30) : Promise.resolve({ data: [] as { id: string; app_id: string; role: string; created_at: string | null }[] }),
  ]);

  const appMap = new Map((apps ?? []).map((app) => [app.id, app.name]));
  const items: ActivityItem[] = [];

  for (const app of apps ?? []) {
    if (app.created_at) items.push({ id: `app-${app.id}`, type: "app", title: "App created", description: `${app.name} was added to your workspace.`, createdAt: app.created_at, appId: app.id, appName: app.name });
  }
  for (const version of versions ?? []) {
    const appName = appMap.get(version.app_id) ?? "your app";
    if (version.created_at) items.push({ id: `version-${version.id}`, type: "version", title: "New version generated", description: `${appName} received a new generated version.`, createdAt: version.created_at, appId: version.app_id, appName });
  }
  for (const deployment of deployments ?? []) {
    const appName = appMap.get(deployment.app_id) ?? "your app";
    const timestamp = deployment.released_at ?? deployment.created_at;
    if (timestamp) items.push({ id: `deployment-${deployment.id}`, type: "deployment", title: deployment.status === "live" ? "Deployment is live" : "Deployment updated", description: `${appName} · ${deployment.platform || "web"} deployment is ${deployment.status || "updated"}.`, createdAt: timestamp, appId: deployment.app_id, appName, status: deployment.status });
  }
  for (const collaborator of collaborators ?? []) {
    const appName = appMap.get(collaborator.app_id) ?? "your app";
    if (collaborator.created_at) items.push({ id: `team-${collaborator.id}`, type: "team", title: "Team access changed", description: `A collaborator was added to ${appName} as ${collaborator.role}.`, createdAt: collaborator.created_at, appId: collaborator.app_id, appName });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const limitedItems = items.slice(0, 50);
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentCount = limitedItems.filter((item) => new Date(item.createdAt).getTime() >= dayAgo).length;

  return NextResponse.json({ items: limitedItems, recentCount, total: items.length });
}
