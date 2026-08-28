import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";
import { generateApp } from "@/lib/gemini";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporting";
import { createReleaseArtifact } from "@/lib/release-artifact";

/**
 * Conversational project edit: asks Gemini to extend the existing project
 * with one focused change, then records a new immutable app version.
 * The existing generation pipeline remains the source of truth.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rate = checkRateLimit(globalRateLimitStore, `edit:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) return NextResponse.json({ error: "Too many edit requests. Try again shortly." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { instruction?: string };
  const instruction = body.instruction?.trim();
  if (!instruction || instruction.length < 4) return NextResponse.json({ error: "Describe the change you want to make." }, { status: 400 });
  if (instruction.length > 2000) return NextResponse.json({ error: "Edit request is too long (2,000 characters maximum)." }, { status: 400 });

  const { data: app } = await supabase.from("apps").select("id,name,description,platforms,user_id").eq("id", params.id).single();
  if (!app) return NextResponse.json({ error: "App not found." }, { status: 404 });

  let role: "owner" | "editor" | "viewer" | null = app.user_id === user.id ? "owner" : null;
  if (!role) {
    const { data: collaborator } = await supabase.from("app_collaborators").select("role").eq("app_id", app.id).eq("user_id", user.id).maybeSingle();
    role = collaborator?.role === "editor" ? "editor" : collaborator?.role === "viewer" ? "viewer" : null;
  }
  if (!role) return NextResponse.json({ error: "You do not have access to this app." }, { status: 403 });
  if (role === "viewer") return NextResponse.json({ error: "Viewer access cannot make changes." }, { status: 403 });

  const [{ data: profile }, { data: subscription }, { data: latest }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan,credits_remaining").eq("user_id", user.id).single(),
    supabase.from("app_versions").select("version_number").eq("app_id", app.id).order("version_number", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!profile || !subscription) return NextResponse.json({ error: "Account not fully provisioned" }, { status: 500 });

  const context = { role: profile.role, plan: subscription.plan, creditsRemaining: subscription.credits_remaining } as const;
  const gate = canUseFeature(context, "updateExistingScreen");
  if (!gate.allowed) return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });

  try {
    const project = await generateApp({
      name: app.name,
      description: `${app.description ?? "Existing application"}\n\nFOCUSED CHANGE REQUEST:\n${instruction}\n\nApply this change to the existing application and preserve unrelated behavior.`,
      answers: {
        platforms: (app.platforms?.length ? app.platforms : ["web"]) as ("ios" | "android" | "web")[],
        coreScreens: [], navigationPattern: "tabs", needsBackend: true,
        colorTheme: "preserve existing theme", authentication: "none",
        database: "none", apiStyle: "none", fileStorage: false,
      },
      importedProject: { source: "github", ref: `app:${app.id}:latest` },
    });

    const deduction = deductCredits(context, "updateExistingScreen");
    if (!deduction.success) return NextResponse.json({ error: "Insufficient credits." }, { status: 403 });

    const admin = createServiceRoleClient();
    const nextVersion = (latest?.version_number ?? 0) + 1;
    const artifact = await createReleaseArtifact(app.id, nextVersion, project.files);
    const { data: version, error: versionError } = await admin.from("app_versions").insert({
      app_id: app.id,
      version_number: nextVersion,
      storage_path: artifact.path,
      change_summary: instruction,
      artifact_checksum: artifact.checksum,
      artifact_size_bytes: artifact.sizeBytes,
    }).select().single();
    if (versionError) throw versionError;

    await admin.from("subscriptions").update({ credits_remaining: deduction.creditsRemaining }).eq("user_id", user.id);
    return NextResponse.json({ version, project, creditsRemaining: deduction.creditsRemaining });
  } catch (err) {
    reportError(err, { route: `/api/apps/${params.id}/edit`, userId: user.id });
    return NextResponse.json({ error: "AI edit failed. No credits were deducted." }, { status: 502 });
  }
}
