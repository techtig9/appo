/**
 * Every outbound call Appo makes to a third party (AI providers, Resend,
 * GitHub, customer webhooks) goes through this. Without a timeout a single
 * hanging upstream connection pins a serverless invocation until the
 * platform kills it — which is exactly what a "generation stuck forever"
 * report looks like from the outside. `fetch` has no default timeout, so
 * one has to be supplied explicitly.
 */

export interface TimeoutFetchOptions extends RequestInit {
  /** Milliseconds before the request is aborted. */
  timeoutMs?: number;
}

export class UpstreamTimeoutError extends Error {
  constructor(public readonly url: string, public readonly timeoutMs: number) {
    super(`Upstream request timed out after ${timeoutMs}ms`);
    this.name = "UpstreamTimeoutError";
  }
}

export const DEFAULT_TIMEOUT_MS = 30_000;

export async function fetchWithTimeout(url: string, options: TimeoutFetchOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Preserve a caller-supplied signal (used for user-initiated cancellation)
  // alongside our own timeout signal.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw new UpstreamTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retries only on conditions that are genuinely transient. A 4xx that is
 * not 408/429 means the request itself is wrong — retrying it just burns
 * quota and delays the real error reaching the user.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 529;
}

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Injected in tests so retry logic is verifiable without real elapsed time. */
  sleep?: (ms: number) => Promise<void>;
}

export function backoffDelayMs(attempt: number, baseDelayMs = 400, maxDelayMs = 8_000): number {
  return Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
}

/**
 * Runs `task`, retrying while `shouldRetry` says the failure is transient.
 * Deliberately generic over the task rather than wrapping fetch directly —
 * the AI router needs to retry "call provider AND parse its JSON", not
 * just the HTTP hop.
 */
export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const { attempts = 3, baseDelayMs = 400, maxDelayMs = 8_000 } = options;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      const isLast = attempt === attempts - 1;
      if (isLast || !shouldRetry(error, attempt)) throw error;
      await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs));
    }
  }
  throw lastError;
}
