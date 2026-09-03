import { createClient } from "@/lib/supabase/server";
import { apiError, apiOk } from "@/lib/api/responses";
import { parseJsonBody, parseSearchParams, uuidSchema, z } from "@/lib/api/validation";
import { unreadCount } from "@/lib/notifications";

export const dynamic = "force-dynamic";

/**
 * The notification centre reads and writes through the user's OWN client,
 * not the service role. RLS already restricts select/update to
 * `user_id = auth.uid()`, so ownership is enforced by the database rather
 * than by a filter this route could forget to apply. There is no insert
 * policy at all — notifications are only ever created server-side by the
 * events that produce them.
 */

const querySchema = z.object({
  category: z.enum(["auth", "generation", "project", "deployment", "billing", "team", "system"]).optional(),
  unread: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to view notifications.");

  const parsed = parseSearchParams(req.url, querySchema);
  if (!parsed.ok) return parsed.response;
  const { category, unread, limit } = parsed.data;

  let query = supabase
    .from("notifications")
    .select("id, category, title, body, href, severity, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit ?? 30);

  if (category) query = query.eq("category", category);
  if (unread === "true") query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) return apiError("internal_error", "Couldn't load your notifications.");

  // Counted separately so the badge stays correct even when the list is
  // filtered to one category.
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return apiOk({
    notifications: data ?? [],
    unread: count ?? unreadCount(data ?? []),
  });
}

const patchSchema = z.union([
  z.object({ action: z.literal("mark_read"), ids: z.array(uuidSchema).min(1).max(200) }),
  z.object({ action: z.literal("mark_all_read") }),
]);

export async function PATCH(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return apiError("unauthenticated", "Sign in to update notifications.");

  const parsed = await parseJsonBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  const readAt = new Date().toISOString();
  let query = supabase.from("notifications").update({ read_at: readAt }).is("read_at", null);

  if (parsed.data.action === "mark_read") {
    query = query.in("id", parsed.data.ids);
  }

  const { error } = await query;
  if (error) return apiError("internal_error", "Couldn't update your notifications.");

  return apiOk({ ok: true, readAt });
}
