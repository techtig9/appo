import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildChatbotSystemPrompt, buildFallbackResponse, type ChatMessage } from "@/lib/chatbot";
import { checkRateLimit, globalRateLimitStore, RATE_LIMITS } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporting";
import { chatWithAI } from "@/lib/ai-router";

/**
 * Deliberately does NOT require authentication — the chatbot's job
 * includes helping a visitor who hasn't signed up yet decide whether
 * appo is right for them, which only works if it's reachable pre-signup.
 * It never takes any action on the user's behalf (no generating apps, no
 * account changes) — it's advisory only, same category as a support
 * widget, not a gated product feature.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  // Rate-limit key: user id when logged in (reliable), otherwise best-effort
  // IP from the forwarded-for header. That header can be spoofed or absent
  // behind some proxies — this is the same "good enough for now, needs a
  // real edge/WAF-level limiter before this matters at scale" caveat as
  // lib/rate-limit.ts's in-memory store. Falls back to a shared bucket
  // rather than skipping the check entirely if no IP is available at all.
  const forwardedFor = req.headers.get("x-forwarded-for");
  const rateLimitKey = user?.id ?? forwardedFor?.split(",")[0]?.trim() ?? "anonymous-shared";

  const rate = checkRateLimit(globalRateLimitStore, `chatbot:${rateLimitKey}`, RATE_LIMITS.chatbot);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many messages. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } }
    );
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  try {
    const systemPrompt = buildChatbotSystemPrompt(isAuthenticated);
    const reply = await chatWithAI(systemPrompt, messages.map((m) => ({ role: m.role, content: m.content })));
    return NextResponse.json({ reply });

  } catch (err) {
    reportError(err, { route: "/api/chatbot", userId: user?.id });
    return NextResponse.json({ reply: buildFallbackResponse(isAuthenticated) });
  }
}
