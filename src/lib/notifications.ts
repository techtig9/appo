import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationCategory, NotificationRow } from "./supabase/types";
import { logger } from "./logger";

/**
 * In-app notification centre. Deliberately separate from email: a user who
 * has turned off email alerts should still see what happened in the
 * product, and an email provider outage must not lose the record.
 *
 * Rows are only ever written with the service role (RLS has no insert
 * policy) so a client cannot fabricate, say, a "Payment successful" entry.
 */

export interface NotificationInput {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string;
  href?: string;
  severity?: "info" | "success" | "warning" | "error";
}

export async function notify(
  admin: SupabaseClient<Database>,
  input: NotificationInput
): Promise<void> {
  try {
    const { error } = await admin.from("notifications").insert({
      user_id: input.userId,
      category: input.category,
      title: input.title.slice(0, 160),
      body: input.body?.slice(0, 600) ?? null,
      href: input.href ?? null,
      severity: input.severity ?? "info",
    });
    if (error) logger.warn("Notification insert failed", { category: input.category, error });
  } catch (error) {
    logger.warn("Notification insert threw", { category: input.category, error });
  }
}

/** Grouping used by the notification centre's filter chips. */
export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  auth: "Security",
  generation: "AI builds",
  project: "Projects",
  deployment: "Deployments",
  billing: "Billing",
  team: "Team",
  system: "System",
};

export function unreadCount(rows: Pick<NotificationRow, "read_at">[]): number {
  return rows.reduce((total, row) => (row.read_at ? total : total + 1), 0);
}

/**
 * Groups notifications into the day buckets the UI renders as headings.
 * Pure so the bucketing can be tested without a database or a fixed clock.
 */
export function groupByDay<T extends { created_at: string }>(
  rows: T[],
  now = new Date()
): { label: string; items: T[] }[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  const buckets: { label: string; items: T[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Earlier this week", items: [] },
    { label: "Older", items: [] },
  ];

  for (const row of rows) {
    const at = new Date(row.created_at);
    if (at >= startOfToday) buckets[0].items.push(row);
    else if (at >= startOfYesterday) buckets[1].items.push(row);
    else if (at >= startOfWeek) buckets[2].items.push(row);
    else buckets[3].items.push(row);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}
