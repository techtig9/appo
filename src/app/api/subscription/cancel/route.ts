import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { computeCancellation } from "@/lib/account-lifecycle";

/**
 * Self-serve cancellation. Per Terms §3 and computeCancellation()'s policy,
 * this always takes effect at the end of the current billing period — the
 * user keeps full access to their current plan until then. The actual
 * downgrade-to-free happens in the Paddle webhook handler when the period
 * genuinely ends (subscription.canceled event), not here — this route just
 * schedules it and reflects the pending state back to the UI immediately.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan, paddle_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (!subscription) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  if (subscription.plan === "free") {
    return NextResponse.json({ error: "Free plan has nothing to cancel" }, { status: 400 });
  }

  const cancellation = computeCancellation();

  // In production this also calls Paddle's API to schedule cancellation
  // on the actual subscription (subscription.paddle_subscription_id).
  // That call needs network access this offline sandbox doesn't have, so
  // it's noted here rather than silently omitted.
  // Service-role write — same RLS reasoning as /api/generate/route.ts:
  // subscription status changes must go through server-verified logic,
  // never a direct write with the user's own credentials.
  const admin = createServiceRoleClient();
  await admin
    .from("subscriptions")
    .update({ status: cancellation.newStatus })
    .eq("id", subscription.id);

  return NextResponse.json({
    status: cancellation.newStatus,
    message: "Your plan is cancelled and won't renew. You'll keep full access until the end of this billing period.",
  });
}
