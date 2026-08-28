export interface AdminGuardResult {
  ok: boolean;
  userId?: string;
  status: number;
  error?: string;
}

/**
 * Pure decision table for admin route access — deliberately has zero
 * imports so it can be unit tested without Supabase/Next.js installed.
 * The I/O wrapper that actually calls Supabase lives in admin-guard.ts.
 */
export function evaluateAdminAccess(user: { id: string } | null, role: string | null): AdminGuardResult {
  if (!user) return { ok: false, status: 401, error: "Not authenticated" };
  if (role !== "admin") return { ok: false, status: 403, error: "Admin access required" };
  return { ok: true, userId: user.id, status: 200 };
}
