import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "all").trim().toLowerCase();

  let seedQuery = supabase.from("templates").select("id, category, name, thumbnail").order("name");
  if (category !== "all") seedQuery = seedQuery.eq("category", category);
  if (q) seedQuery = seedQuery.ilike("name", `%${q}%`);

  let communityQuery = supabase
    .from("apps")
    .select("id, name, platforms, tags, created_at, user_id")
    .eq("is_public_template", true)
    .order("created_at", { ascending: false });
  if (q) communityQuery = communityQuery.ilike("name", `%${q}%`);
  if (category !== "all") communityQuery = communityQuery.contains("tags", [category]);

  const [{ data: seedTemplates }, { data: communityTemplates }] = await Promise.all([seedQuery, communityQuery]);

  return NextResponse.json({
    seedTemplates: seedTemplates ?? [],
    communityTemplates: communityTemplates ?? [],
    categories: ["fitness", "ecommerce", "productivity", "social", "booking"],
  });
}
