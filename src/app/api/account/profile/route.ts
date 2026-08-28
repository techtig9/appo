import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, role, created_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name } = (await req.json()) as { name: string };
  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }

  // Service-role write: `users` has no UPDATE policy for the authenticated
  // role at all (see supabase/schema.sql) — even a harmless field like
  // display name goes through server-validated logic rather than a direct
  // client write, so there's exactly one place (here) that can ever touch
  // this table's sensitive columns like `role`, not a row-level policy
  // that would need to trust every future column added to stay harmless.
  const admin = createServiceRoleClient();
  const { data: updated } = await admin
    .from("users")
    .update({ name: name.trim() })
    .eq("id", user.id)
    .select("name, email, role, created_at")
    .single();

  return NextResponse.json({ profile: updated });
}
