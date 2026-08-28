export type AnalyticsPoint = { date: string; apps: number; versions: number; deployments: number };

export function buildDailySeries(rows: Array<{ created_at?: string | null }>, start: Date, end: Date) {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    if (!row.created_at) continue;
    const d = new Date(row.created_at);
    if (d < start || d > end) continue;
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return buckets;
}

export function lastNDates(days: number, now = new Date()): string[] {
  const out: string[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function percentage(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
