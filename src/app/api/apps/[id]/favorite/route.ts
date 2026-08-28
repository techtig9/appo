import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: app } = await supabase
    .from("apps")
    .select("id, is_favorite")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!app) return NextResponse.json({ error: "App not found" }, { status: 404 });

  const { data: updated } = await supabase
    .from("apps")
    .update({ is_favorite: !app.is_favorite })
    .eq("id", app.id)
    .select("id, is_favorite")
    .single();

  return NextResponse.json({ app: updated });
}
