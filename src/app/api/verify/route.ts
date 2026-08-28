import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { verifyProject, type ProjectFile } from "@/lib/project-verifier";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rate = checkRateLimit(globalRateLimitStore, `verify:${user.id}`, RATE_LIMITS.generate);
  if (!rate.allowed) return NextResponse.json({ error: "Too many verification requests. Try again shortly." }, { status: 429 });

  const body = (await req.json()) as { files?: ProjectFile[] };
  if (!Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json({ error: "No project files supplied." }, { status: 400 });
  }
  if (body.files.length > 500) return NextResponse.json({ error: "Project is too large to verify in one request." }, { status: 413 });

  const totalBytes = body.files.reduce((sum, file) => sum + (file.path?.length ?? 0) + (file.content?.length ?? 0), 0);
  if (totalBytes > 2_000_000) return NextResponse.json({ error: "Project verification payload is too large." }, { status: 413 });

  return NextResponse.json(verifyProject(body.files));
}
