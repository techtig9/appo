import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Liveness + dependency check for an uptime monitor.
 *
 * Returns 200 only when the app is up AND can actually reach the
 * database — a 200 from an app whose database is down is the worst kind of
 * false negative for a monitor to miss.
 *
 * Deliberately unauthenticated (monitors do not log in) and deliberately
 * sparse: it reports whether each dependency is CONFIGURED and, for the
 * database, whether it RESPONDS. It never reports a key, a hostname, a
 * version, or an error message from a provider — a public endpoint is not
 * the place to describe your infrastructure to whoever asks.
 */
export async function GET() {
  const startedAt = Date.now();

  // Presence only. `Boolean(...)` on an env var cannot leak its value.
  const configured = {
    database: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL),
    ai: [process.env.GROQ_API_KEY, process.env.CEREBRAS_API_KEY, process.env.OPENROUTER_API_KEY].filter(Boolean).length,
    email: Boolean(process.env.RESEND_API_KEY),
    billing: Boolean(process.env.PADDLE_WEBHOOK_SECRET),
    errorReporting: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  };

  if (!configured.database) {
    return NextResponse.json(
      { status: "error", database: "not_configured", latencyMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const supabase = createServiceRoleClient();
    // The cheapest real query there is: confirms the connection and the
    // credentials work, without depending on any table's contents.
    const { error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      // Detail goes to the logs, not the response body.
      logger.error("Health check: database unreachable", { error });
      return NextResponse.json(
        { status: "error", database: "unreachable", latencyMs: Date.now() - startedAt },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "ok",
        // Counts and booleans only — enough for a dashboard to show that
        // email is unconfigured, without describing the setup.
        services: {
          aiProvidersConfigured: configured.ai,
          emailConfigured: configured.email,
          billingConfigured: configured.billing,
          errorReportingConfigured: configured.errorReporting,
        },
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    logger.error("Health check threw", { error });
    return NextResponse.json(
      { status: "error", database: "unreachable", latencyMs: Date.now() - startedAt },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
