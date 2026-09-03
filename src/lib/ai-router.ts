import { fetchWithTimeout, isRetryableStatus, withRetry, UpstreamTimeoutError } from "./http/fetch-with-timeout";
import { redactString } from "./logger";

export interface GeneratorAnswers {
  platforms: ("ios" | "android" | "web")[];
  coreScreens: string[];
  navigationPattern: "tabs" | "stack" | "drawer";
  needsBackend: boolean;
  colorTheme: string;
  authentication: "none" | "email" | "email_google";
  database: "none" | "postgresql";
  apiStyle: "none" | "rest";
  fileStorage: boolean;
}

export interface GenerateAppRequest {
  name: string;
  description: string;
  answers: GeneratorAnswers;
  importedProject?: { source: "github" | "zip"; ref: string; files?: { path: string; content: string }[] };
  engineeredContext?: string;
}

export interface GeneratedProject {
  files: { path: string; content: string }[];
  summary: string;
}

type Provider = "groq" | "cerebras" | "openrouter" | "anthropic";

const DEFAULT_MODELS: Record<Provider, string> = {
  groq: "llama-3.3-70b-versatile",
  cerebras: "llama-3.3-70b",
  openrouter: "openai/gpt-oss-120b",
  anthropic: "claude-sonnet-4-20250514",
};

const PROVIDER_NAMES: Record<Provider, string> = {
  groq: "Groq",
  cerebras: "Cerebras",
  openrouter: "OpenRouter",
  anthropic: "Anthropic Claude",
};

/**
 * Per-call ceilings. Generation legitimately takes tens of seconds on a
 * large project, so its budget is generous; chat must feel interactive and
 * gets a much tighter one. Without these, `fetch` waits forever and a
 * single stalled provider connection holds the request open until the
 * platform kills the whole invocation — which the user experiences as a
 * generation that never finishes and never errors.
 */
const GENERATION_TIMEOUT_MS = 120_000;
const CHAT_TIMEOUT_MS = 30_000;

/** Attempts per provider before failing over to the next one. */
const ATTEMPTS_PER_PROVIDER = 2;

/**
 * Carries the HTTP status so the retry/failover decision is made on facts
 * rather than by pattern-matching an error string.
 */
export class ProviderError extends Error {
  constructor(
    public readonly provider: Provider,
    message: string,
    public readonly status?: number,
    public readonly retryable = false
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function buildPrompt(req: GenerateAppRequest): string {
  const base = req.importedProject
    ? `You are extending an existing Expo/React Native project (source: ${req.importedProject.source}, ref: ${req.importedProject.ref}). Apply only the requested change; do not regenerate unrelated files.`
    : `You are generating a brand-new Expo/React Native project from scratch.`;

  const lines = [
    base,
    `App name: ${req.name}`,
    `Description: ${req.description}`,
    `Target platform(s): ${req.answers.platforms.join(", ")}`,
    `Core screens: ${req.answers.coreScreens.join(", ")}`,
    `Navigation pattern: ${req.answers.navigationPattern}`,
    `Needs login/backend: ${req.answers.needsBackend ? "yes" : "no"}`,
    `Authentication: ${req.answers.authentication}`,
    `Database: ${req.answers.database}`,
    `API style: ${req.answers.apiStyle}`,
    `File storage: ${req.answers.fileStorage ? "enabled" : "disabled"}`,
    `Color theme: ${req.answers.colorTheme}`,
  ];

  if (req.importedProject?.files?.length) {
    const source = req.importedProject.files
      .slice(0, 120)
      .map((f) => `--- ${f.path} ---\n${f.content.slice(0, 12000)}`)
      .join("\n");
    lines.push(`Imported source files are included below. Preserve the existing architecture and return the complete updated project, not a patch.\n${source}`);
  }

  if (req.engineeredContext) lines.push(req.engineeredContext);

  lines.push(
    `When backend features are enabled, generate real implementation-ready server/data structures, authentication flows, API routes, validation, and database-aware code rather than mock JSON. Keep secrets server-side and include clear environment variable names.`,
    `Respond with a JSON object: { "files": [{ "path": string, "content": string }], "summary": string }. No prose outside the JSON.`,
  );

  return lines.join("\n");
}

function estimateTaskSize(req: GenerateAppRequest): { large: boolean; score: number; reasons: string[] } {
  const sourceChars = (req.importedProject?.files ?? []).reduce((sum, f) => sum + f.content.length, 0);
  const descriptionChars = req.description.length;
  const screens = req.answers.coreScreens.length;
  const score =
    (req.importedProject ? 3 : 0) +
    (sourceChars > 50000 ? 3 : sourceChars > 20000 ? 2 : 0) +
    (descriptionChars > 2500 ? 2 : descriptionChars > 1200 ? 1 : 0) +
    (screens >= 10 ? 2 : screens >= 6 ? 1 : 0) +
    (req.answers.needsBackend ? 1 : 0) +
    (req.answers.database !== "none" ? 1 : 0) +
    (req.answers.fileStorage ? 1 : 0) +
    (req.answers.authentication !== "none" ? 1 : 0);

  const reasons: string[] = [];
  if (req.importedProject) reasons.push("existing project");
  if (sourceChars > 20000) reasons.push("large source context");
  if (descriptionChars > 1200) reasons.push("long requirements");
  if (screens >= 6) reasons.push("many screens");
  if (req.answers.needsBackend) reasons.push("backend requirements");
  if (req.answers.database !== "none") reasons.push("database requirements");
  if (req.answers.fileStorage) reasons.push("file storage");
  if (req.answers.authentication !== "none") reasons.push("authentication");

  return { large: score >= 4, score, reasons };
}

function isLimitOrAvailabilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return /429|rate.?limit|quota|too many|credit|insufficient|capacity|overloaded|temporar|timeout|503|529/.test(message);
}

async function readJsonResponse(res: Response, provider: Provider): Promise<unknown> {
  const text = await res.text();
  if (!res.ok) {
    // Provider error bodies routinely echo the request back, API key
    // header included. Redact before this string is allowed anywhere near
    // a log sink or an error response.
    const detail = redactString(text.slice(0, 300).replace(/\s+/g, " "));
    throw new ProviderError(
      provider,
      `${PROVIDER_NAMES[provider]} API error: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`,
      res.status,
      isRetryableStatus(res.status)
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    // Malformed JSON from an otherwise-200 response is usually a truncated
    // stream; one more attempt is worth it before failing over.
    throw new ProviderError(provider, `${PROVIDER_NAMES[provider]} returned invalid JSON.`, res.status, true);
  }
}

function parseGeneratedProject(value: unknown, provider: Provider): GeneratedProject {
  const data = value as any;
  const text = provider === "anthropic"
    ? data?.content?.find((part: any) => part?.type === "text")?.text ?? ""
    : data?.choices?.[0]?.message?.content ?? "";

  if (!text) throw new ProviderError(provider, `${PROVIDER_NAMES[provider]} returned an empty response.`, undefined, true);

  const cleaned = String(text).replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ProviderError(provider, `${PROVIDER_NAMES[provider]} returned malformed project JSON.`, undefined, true);
  }

  if (!parsed || !Array.isArray(parsed.files) || typeof parsed.summary !== "string") {
    throw new ProviderError(provider, `${PROVIDER_NAMES[provider]} returned an invalid project structure.`, undefined, true);
  }
  return parsed as GeneratedProject;
}

async function callOpenAICompatible(
  provider: Exclude<Provider, "anthropic">,
  apiKey: string,
  model: string,
  prompt: string,
  signal?: AbortSignal
): Promise<GeneratedProject> {
  const endpoints: Record<Exclude<Provider, "anthropic">, string> = {
    groq: "https://api.groq.com/openai/v1/chat/completions",
    cerebras: "https://api.cerebras.ai/v1/chat/completions",
    openrouter: "https://openrouter.ai/api/v1/chat/completions",
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = env("OPENROUTER_SITE_URL") ?? "http://localhost:3000";
    headers["X-Title"] = env("OPENROUTER_APP_NAME") ?? "Appo AI App Builder";
  }

  const res = await fetchWithTimeout(endpoints[provider], {
    method: "POST",
    headers,
    timeoutMs: GENERATION_TIMEOUT_MS,
    signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are Appo's expert software architect and app generator. Return only valid JSON matching the requested schema." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });
  return parseGeneratedProject(await readJsonResponse(res, provider), provider);
}

async function callAnthropic(apiKey: string, model: string, prompt: string, signal?: AbortSignal): Promise<GeneratedProject> {
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    timeoutMs: GENERATION_TIMEOUT_MS,
    signal,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(env("ANTHROPIC_MAX_TOKENS") ?? 32000),
      system: "You are Appo's senior software architect. For complex tasks, produce complete, production-quality Expo/React Native project source. Return only valid JSON matching the requested schema.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  return parseGeneratedProject(await readJsonResponse(res, "anthropic"), "anthropic");
}

function configuredProviders(largeTask: boolean): Provider[] {
  const providers: Provider[] = [];
  if (env("GROQ_API_KEY")) providers.push("groq");
  if (env("CEREBRAS_API_KEY")) providers.push("cerebras");
  if (env("OPENROUTER_API_KEY")) providers.push("openrouter");
  if (largeTask && env("ANTHROPIC_API_KEY")) providers.push("anthropic");
  return providers;
}

function modelFor(provider: Provider): string {
  const names: Record<Provider, string> = {
    groq: "GROQ_MODEL",
    cerebras: "CEREBRAS_MODEL",
    openrouter: "OPENROUTER_MODEL",
    anthropic: "ANTHROPIC_MODEL",
  };
  return env(names[provider]) ?? DEFAULT_MODELS[provider];
}

function apiKeyFor(provider: Provider): string | undefined {
  const names: Record<Provider, string> = {
    groq: "GROQ_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
  };
  return env(names[provider]);
}

/**
 * A failure is worth a same-provider retry only when it is transient: a
 * 429/5xx, a timeout, or a truncated/unparseable body. A 400 or a 401 will
 * fail identically every time — retrying it wastes the user's wall clock
 * and delays failover to a provider that would have worked.
 */
export function shouldRetrySameProvider(error: unknown): boolean {
  if (error instanceof UpstreamTimeoutError) return false; // already burned the budget; move on
  if (error instanceof ProviderError) return error.retryable;
  return isLimitOrAvailabilityError(error);
}

export interface GenerateOptions {
  /** Lets a caller cancel an in-flight generation (user pressed Cancel). */
  signal?: AbortSignal;
  /** Injected in tests so retry backoff does not consume real time. */
  sleep?: (ms: number) => Promise<void>;
}

export async function generateApp(req: GenerateAppRequest, options: GenerateOptions = {}): Promise<GeneratedProject> {
  const task = estimateTaskSize(req);
  const providers = configuredProviders(task.large);

  if (!providers.length) {
    throw new Error(
      task.large
        ? "No AI provider is configured. Add GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY. For large tasks you can optionally add ANTHROPIC_API_KEY."
        : "No AI provider is configured. Add GROQ_API_KEY, CEREBRAS_API_KEY, or OPENROUTER_API_KEY.",
    );
  }

  const prompt = buildPrompt(req);
  const failures: string[] = [];

  // Routing order: Groq -> Cerebras -> OpenRouter -> Claude (large tasks
  // only). Each provider gets a bounded retry for transient faults before
  // the next one is tried, so a single 503 does not immediately push a
  // request onto a slower, more expensive provider.
  for (const provider of providers) {
    if (options.signal?.aborted) throw new Error("Generation was cancelled.");

    const key = apiKeyFor(provider);
    if (!key) continue;
    const model = modelFor(provider);

    try {
      return await withRetry(
        () =>
          provider === "anthropic"
            ? callAnthropic(key, model, prompt, options.signal)
            : callOpenAICompatible(provider as Exclude<Provider, "anthropic">, key, model, prompt, options.signal),
        (error) => shouldRetrySameProvider(error),
        { attempts: ATTEMPTS_PER_PROVIDER, sleep: options.sleep }
      );
    } catch (error) {
      if (options.signal?.aborted) throw new Error("Generation was cancelled.");
      const message = error instanceof Error ? error.message : String(error);
      // redactString again here: a non-ProviderError (a raw network error,
      // say) has not been through readJsonResponse's redaction.
      failures.push(`${PROVIDER_NAMES[provider]}: ${redactString(message)}`);
    }
  }

  const taskNote = task.large
    ? `Large-task detection: yes${task.reasons.length ? ` (${task.reasons.join(", ")})` : ""}.`
    : "Large-task detection: no.";
  throw new Error(`All configured AI providers failed. ${taskNote} ${failures.join(" | ")}`);
}

export async function chatWithAI(systemPrompt: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const providers: Exclude<Provider, "anthropic">[] = [];
  if (env("GROQ_API_KEY")) providers.push("groq");
  if (env("CEREBRAS_API_KEY")) providers.push("cerebras");
  if (env("OPENROUTER_API_KEY")) providers.push("openrouter");
  if (!providers.length) throw new Error("No chat AI provider is configured.");

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const key = provider === "groq" ? env("GROQ_API_KEY")! : provider === "cerebras" ? env("CEREBRAS_API_KEY")! : env("OPENROUTER_API_KEY")!;
      const endpoint: Record<Exclude<Provider, "anthropic">, string> = {
        groq: "https://api.groq.com/openai/v1/chat/completions",
        cerebras: "https://api.cerebras.ai/v1/chat/completions",
        openrouter: "https://openrouter.ai/api/v1/chat/completions",
      };
      const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
      if (provider === "openrouter") {
        headers["HTTP-Referer"] = env("OPENROUTER_SITE_URL") ?? "http://localhost:3000";
        headers["X-Title"] = env("OPENROUTER_APP_NAME") ?? "Appo AI App Builder";
      }
      const res = await fetchWithTimeout(endpoint[provider], {
        method: "POST",
        headers,
        timeoutMs: CHAT_TIMEOUT_MS,
        body: JSON.stringify({
          model: modelFor(provider),
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.3,
        }),
      });
      const data = await readJsonResponse(res, provider) as any;
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new ProviderError(provider, `${PROVIDER_NAMES[provider]} returned an empty chat response.`, undefined, true);
      return String(text);
    } catch (error) {
      failures.push(redactString(error instanceof Error ? error.message : String(error)));
    }
  }
  throw new Error(`All chat AI providers failed: ${failures.join(" | ")}`);
}

export const __testables = {
  buildPrompt,
  estimateTaskSize,
  configuredProviders,
  isLimitOrAvailabilityError,
  shouldRetrySameProvider,
  apiKeyFor,
  modelFor,
  DEFAULT_MODELS,
  GENERATION_TIMEOUT_MS,
  CHAT_TIMEOUT_MS,
  ATTEMPTS_PER_PROVIDER,
};
