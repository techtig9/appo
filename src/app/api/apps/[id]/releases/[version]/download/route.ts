import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSignedReleaseUrl } from "@/lib/release-artifact";

export async function GET(_req: Request, { params }: { params: { id: string; version: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: app } = await supabase.from("apps").select("id,user_id").eq("id", params.id).single();
  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });
  let allowed = app.user_id === user.id;
  if (!allowed) {
    const { data: member } = await supabase.from("app_collaborators").select("role").eq("app_id", app.id).eq("user_id", user.id).maybeSingle();
    allowed = member?.role === "owner" || member?.role === "editor";
  }
  if (!allowed) return NextResponse.json({ error: "You do not have permission to download releases." }, { status: 403 });

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.version);
  const versionNumber = Number(params.version);
  if (!isUuid && (!Number.isInteger(versionNumber) || versionNumber < 1)) return NextResponse.json({ error: "Invalid version." }, { status: 400 });
  const query = supabase.from("app_versions").select("storage_path,version_number,artifact_checksum,artifact_size_bytes").eq("app_id", app.id);
  const { data: version } = await (isUuid ? query.eq("id", params.version) : query.eq("version_number", versionNumber)).single();
  if (!version?.storage_path) return NextResponse.json({ error: "Release artifact not found." }, { status: 404 });
  try {
    const url = await getSignedReleaseUrl(version.storage_path);
    return NextResponse.json({ url, version: version.version_number, checksum: version.artifact_checksum, sizeBytes: version.artifact_size_bytes, expiresIn: 900 });
  } catch {
    return NextResponse.json({ error: "Release artifact is unavailable." }, { status: 503 });
  }
}
