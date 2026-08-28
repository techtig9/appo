import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";
import { exportToGithub, sanitizeRepoName } from "@/lib/github-export";
import { reportError } from "@/lib/error-reporting";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { githubAccessToken } = (await req.json()) as { githubAccessToken: string };

  const [{ data: profile }, { data: subscription }, { data: app }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
    supabase.from("apps").select("*").eq("id", params.id).eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription || !app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userContext = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining };

  // Pro/Business only — pairs with "Import Existing App" (GitHub in, GitHub out).
  const gate = canUseFeature(userContext, "githubExport");
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });
  }

  try {
    // In production this loads the app's actual generated files from
    // Supabase Storage. Wiring omitted here — see the storage_path column
    // on app_versions for where that would come from.
    const result = await exportToGithub({
      accessToken: githubAccessToken,
      repoName: sanitizeRepoName(app.name),
      files: [{ path: "README.md", content: `# ${app.name}\n\nExported from appo.` }],
    });

    deductCredits(userContext, "githubExport"); // zero-cost, kept for consistent logging
    return NextResponse.json(result);
  } catch (err) {
    reportError(err, { route: "/api/apps/[id]/github-export", userId: user.id });
    return NextResponse.json({ error: "GitHub export failed" }, { status: 502 });
  }
}
