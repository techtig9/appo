import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { reportError } from "@/lib/error-reporting";

/**
 * Self-serve account deletion (GDPR/CCPA right to erasure — see Privacy
 * Policy §4). Requires the user to type their email to confirm, checked
 * client-side before this route is ever called (see Settings page).
 *
 * Deletes, in order: apps (and cascading app_versions/deployments via FK),
 * subscriptions, payments, the users row, then the Supabase Auth user
 * itself. Uses the service-role client since deleting the auth user is an
 * admin-only operation.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createServiceRoleClient();

  await admin.from("apps").delete().eq("user_id", user.id);
  await admin.from("subscriptions").delete().eq("user_id", user.id);
  await admin.from("payments").delete().eq("user_id", user.id);
  await admin.from("users").delete().eq("id", user.id);

  const { error: authError } = await admin.auth.admin.deleteUser(user.id);
  if (authError) {
    // Row data is already gone at this point — log loudly rather than
    // silently leaving an orphaned auth-only account.
    reportError(authError, { route: "/api/account/delete", userId: user.id });
    return NextResponse.json(
      { error: "Account data was deleted, but the login itself couldn't be removed. Contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
