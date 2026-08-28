/**
 * Fixed-window rate limiter. Pure algorithm + a pluggable store interface,
 * so the logic is unit-testable without any real storage, and the store
 * can be swapped for a real one in production without touching this file.
 *
 * IMPORTANT — production note: InMemoryRateLimitStore below only works
 * correctly on a single long-running instance. Next.js on Vercel runs
 * multiple serverless instances, each with its own memory, so in-memory
 * limits are per-instance, not global — a determined abuser could get a
 * multiple of the intended limit by hitting different instances. Before
 * launch, swap InMemoryRateLimitStore for a real shared store (Upstash
 * Redis is the standard pairing with Vercel; Supabase can also work via a
 * counter table). The RateLimitStore interface is the swap point — nothing
 * else needs to change.
 */

export interface RateLimitWindow {
  count: number;
  windowStart: number;
}

export interface RateLimitStore {
  get(key: string): RateLimitWindow | undefined;
  set(key: string, value: RateLimitWindow): void;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private map = new Map<string, RateLimitWindow>();

  get(key: string) {
    return this.map.get(key);
  }

  set(key: string, value: RateLimitWindow) {
    this.map.set(key, value);
  }
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Checks and records one request against the limit. `now` is an explicit
 * parameter (defaulting to Date.now()) specifically so tests can drive it
 * deterministically instead of relying on real elapsed time.
 */
export function checkRateLimit(
  store: RateLimitStore,
  key: string,
  config: RateLimitConfig,
  now: number = Date.now()
): RateLimitResult {
  const existing = store.get(key);

  if (!existing || now - existing.windowStart >= config.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: config.limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, retryAfterMs: config.windowMs - (now - existing.windowStart) };
  }

  store.set(key, { count: existing.count + 1, windowStart: existing.windowStart });
  return { allowed: true, remaining: config.limit - existing.count - 1, retryAfterMs: 0 };
}

/**
 * Named limits for specific routes — one place to see/tune every rate
 * limit in the app instead of magic numbers scattered across routes.
 */
export const RATE_LIMITS = {
  generate: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 generations/hour/user
  analyze: { limit: 60, windowMs: 60 * 60 * 1000 }, // free but still capped — 60/hour/user
  clone: { limit: 30, windowMs: 60 * 60 * 1000 },
  githubExport: { limit: 20, windowMs: 60 * 60 * 1000 },
  // Chatbot is a real Gemini call reachable by anonymous landing-page
  // visitors (no user id to key on) — tighter and keyed by IP instead.
  // See the IP-derivation caveat in /api/chatbot/route.ts.
  chatbot: { limit: 15, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitConfig>;

// Shared process-lifetime store for route handlers. See the production
// note above before relying on this beyond a single-instance deployment.
export const globalRateLimitStore = new InMemoryRateLimitStore();
