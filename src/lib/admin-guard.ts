import { createClient } from "./supabase/server";
import { evaluateAdminAccess, type AdminGuardResult } from "./admin-access";

export type { AdminGuardResult };

/**
 * Every /api/admin/* route calls this first. The pure decision logic
 * (evaluateAdminAccess) is unit tested directly in
 * tests/admin-access.test.ts; this wrapper just supplies the real
 * Supabase-backed user/role lookup around it.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return evaluateAdminAccess(null, null);

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  return evaluateAdminAccess(user, profile?.role ?? null);
}
