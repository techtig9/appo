import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { canUseFeature, deductCredits } from "@/lib/credits";
import { generateApp, type GenerateAppRequest } from "@/lib/gemini";
import { buildEngineeredContext, type AppCategory } from "@/lib/prompt-engineer";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporting";
import { createReleaseArtifact } from "@/lib/release-artifact";

interface GenerateRequestBody extends GenerateAppRequest {
  /** Raw answers to the AI Prompt Engineer's adaptive follow-up questions. */
  smartAnswers?: Record<string, string>;
  detectedCategory?: AppCategory;
}

export async function POST(req: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit BEFORE any DB/AI work — this is what actually protects
  // Gemini spend from a runaway client or a bug, independent of credits
  // (a credit bug or a very high plan balance shouldn't be the only thing
  // standing between a bad request loop and your API bill).
  const rate = checkRateLimit(globalRateLimitStore, `generate:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many generation requests. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("subscriptions").select("plan, credits_remaining").eq("user_id", user.id).single(),
  ]);

  if (!profile || !subscription) {
    return NextResponse.json({ error: "Account not fully provisioned" }, { status: 500 });
  }

  const userContext = {
    role: profile.role,
    plan: subscription.plan,
    creditsRemaining: subscription.credits_remaining,
  };

  const body = (await req.json()) as GenerateRequestBody;
  const action = body.importedProject ? "importAndExtendApp" : "generateFullApp";

  const gate = canUseFeature(userContext, action);
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, reason: gate.reason }, { status: 403 });
  }

  // Fold the AI Prompt Engineer's adaptive Q&A into this SAME generation
  // call rather than a separate one — see lib/prompt-engineer.ts and
  // lib/gemini.ts for why that's what keeps this step free.
  const engineeredContext =
    body.detectedCategory && body.smartAnswers && Object.keys(body.smartAnswers).length > 0
      ? buildEngineeredContext(body.detectedCategory, body.smartAnswers)
      : undefined;

  const generationRequest: GenerateAppRequest = { ...body, engineeredContext };

  try {
    const project = await generateApp(generationRequest);

    const admin = createServiceRoleClient();
    const { data: app, error: appError } = await admin
      .from("apps")
      .insert({ user_id: user.id, name: body.name, platforms: body.answers.platforms })
      .select()
      .single();
    if (appError || !app) throw appError ?? new Error("App could not be created");

    try {
      const artifact = await createReleaseArtifact(app.id, 1, project.files);
      const { error: versionError } = await admin.from("app_versions").insert({
        app_id: app.id,
        version_number: 1,
        storage_path: artifact.path,
        change_summary: "Initial generation",
        artifact_checksum: artifact.checksum,
        artifact_size_bytes: artifact.sizeBytes,
      });
      if (versionError) throw versionError;
    } catch (artifactError) {
      await admin.from("apps").delete().eq("id", app.id);
      throw artifactError;
    }

    // Charge only after the project and immutable production artifact are safely stored.
    const deduction = deductCredits(userContext, action);
    await admin.from("subscriptions").update({ credits_remaining: deduction.creditsRemaining }).eq("user_id", user.id);

    return NextResponse.json({ project, app, creditsRemaining: deduction.creditsRemaining });
  } catch (err) {
    // Generation failed — per the Fair Usage Policy, no credits are deducted.
    reportError(err, { route: "/api/generate", userId: user.id });
    return NextResponse.json({ error: "Generation failed. No credits were deducted." }, { status: 502 });
  }
}
