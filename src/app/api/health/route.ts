import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Point your uptime monitor (UptimeRobot, Better Uptime, Pingdom, etc.) at
 * GET /api/health. Returns 200 only if the app is up AND can actually
 * reach the database — a 200-but-DB-is-down app is the worst kind of
 * false positive for an uptime monitor to miss.
 *
 * Deliberately does not require auth — uptime monitors don't log in — and
 * deliberately returns no data beyond status, to avoid leaking anything.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = createServiceRoleClient();
    // Cheapest possible real query — just confirms the DB connection and
    // credentials actually work, not a specific table's contents.
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", database: "unreachable", latencyMs: Date.now() - startedAt },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      database: "ok",
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", database: "unreachable", latencyMs: Date.now() - startedAt },
      { status: 503 }
    );
  }
}
