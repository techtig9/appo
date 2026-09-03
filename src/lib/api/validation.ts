import { z, type ZodTypeAny, type infer as ZodInfer } from "zod";
import { apiError } from "./responses";

/**
 * Every route that accepts a body parses it through here. Before this
 * existed, routes destructured `await req.json()` straight into database
 * writes — a request with a missing `answers` object threw a TypeError
 * that surfaced as a blank 500, and any extra property the client sent was
 * carried along unchecked.
 */

export const MAX_JSON_BODY_BYTES = 2_000_000;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: ReturnType<typeof apiError> };

function firstIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Request body is invalid.";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

export async function parseJsonBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<ParseResult<ZodInfer<S>>> {
  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BODY_BYTES) {
    return { ok: false, response: apiError("invalid_request", "Request body is too large.", { status: 413 }) };
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { ok: false, response: apiError("invalid_request", "Request body could not be read.") };
  }

  if (raw.length > MAX_JSON_BODY_BYTES) {
    return { ok: false, response: apiError("invalid_request", "Request body is too large.", { status: 413 }) };
  }

  let json: unknown;
  try {
    json = raw.trim() === "" ? {} : JSON.parse(raw);
  } catch {
    return { ok: false, response: apiError("invalid_request", "Request body must be valid JSON.") };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      response: apiError("invalid_request", firstIssueMessage(result.error), {
        details: { issues: result.error.issues.slice(0, 8).map((i) => ({ path: i.path.join("."), message: i.message })) },
      }),
    };
  }

  return { ok: true, data: result.data };
}

export function parseSearchParams<S extends ZodTypeAny>(url: string, schema: S): ParseResult<ZodInfer<S>> {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    return { ok: false, response: apiError("invalid_request", firstIssueMessage(result.error)) };
  }
  return { ok: true, data: result.data };
}

/** Shared primitives so the same rules apply everywhere they are relevant. */
export const uuidSchema = z.string().uuid("must be a valid id");
export const appNameSchema = z
  .string()
  .trim()
  .min(1, "is required")
  .max(80, "must be 80 characters or fewer");
export const platformSchema = z.enum(["ios", "android", "web"]);
export const emailSchema = z.string().trim().toLowerCase().email("must be a valid email address").max(320);

export { z };
