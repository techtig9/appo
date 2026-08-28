import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");

  let query = supabase.from("apps").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (folder) query = query.eq("folder", folder);

  const { data: apps } = await query;
  return NextResponse.json({ apps });
}
