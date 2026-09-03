/**
 * Structured, redacting logger. Two rules drive the design:
 *
 * 1. Production logs are consumed by machines (Vercel log drains, Sentry
 *    breadcrumbs), so they are single-line JSON, not prose.
 * 2. Nothing that looks like a secret ever reaches a log sink. Provider
 *    error bodies routinely echo back request headers, and a naive
 *    `console.error(err)` on an AI provider failure is a realistic way to
 *    leak an API key into a third-party log store.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function minLevel(): LogLevel {
  const configured = process.env.APPO_LOG_LEVEL?.toLowerCase();
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") return configured;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

/** Key names whose values are always replaced, regardless of content. */
const SECRET_KEY_PATTERN = /(api[-_]?key|secret|token|password|passwd|authorization|cookie|session|credential|signature|service[-_]?role|dsn)/i;

/**
 * Value patterns that look like credentials even under an innocuous key —
 * this is what catches a provider error string that embedded the key.
 */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g, // OpenAI/Anthropic/Resend-style
  /\bgsk_[A-Za-z0-9]{20,}\b/g, // Groq
  /\bcsk-[A-Za-z0-9]{20,}\b/g, // Cerebras
  /\bre_[A-Za-z0-9_-]{16,}\b/g, // Resend
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, // GitHub
  /\bpdl_[A-Za-z0-9_]{20,}\b/g, // Paddle
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, // JWT (Supabase keys are JWTs)
  /\bBearer\s+[A-Za-z0-9._-]{16,}/gi,
];

export const REDACTED = "[redacted]";

export function redactString(value: string): string {
  return SECRET_VALUE_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, REDACTED), value);
}

/**
 * Deep-redacts a log payload. Depth-limited and cycle-safe because log
 * context is frequently an arbitrary object handed in by a caller, and a
 * logger that can throw or hang is worse than no logger.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > 6) return "[truncated]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);

  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1, seen));

  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redact(entry, depth + 1, seen);
  }
  return out;
}

export interface LogFields {
  requestId?: string;
  route?: string;
  userId?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export function formatLogLine(level: LogLevel, message: string, fields?: LogFields): string {
  return JSON.stringify({
    level,
    time: new Date().toISOString(),
    message: redactString(message),
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  });
}

function emit(level: LogLevel, message: string, fields?: LogFields): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel()]) return;
  const line = formatLogLine(level, message, fields);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};
