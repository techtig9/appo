/**
 * Validation for AI-generated project files.
 *
 * Everything an LLM returns is untrusted input. These files are written to
 * a ZIP that users download and unpack, and their paths are used to build
 * storage keys — so a `../` in a path is a real archive-traversal
 * (Zip Slip) vector against the person who downloads it, and an absurd
 * file count or size is a cheap way to fill storage.
 *
 * Pure and dependency-free so it is fully unit-testable.
 */

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface SafetyLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxPathLength: number;
  maxPathDepth: number;
}

export const DEFAULT_SAFETY_LIMITS: SafetyLimits = {
  maxFiles: 400,
  maxFileBytes: 1_000_000,
  maxTotalBytes: 20_000_000,
  maxPathLength: 300,
  maxPathDepth: 12,
};

/**
 * Extensions that would be executed or loaded with elevated trust if they
 * landed in the wrong place. Appo generates Expo/React Native/web source;
 * none of these belong in that output.
 */
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".dll", ".so", ".dylib", ".bat", ".cmd", ".com", ".scr", ".msi",
  ".ps1", ".vbs", ".jar", ".apk", ".ipa", ".deb", ".rpm", ".pkg",
]);

/** Filenames that must never be produced by a generator. */
const BLOCKED_BASENAMES = new Set([
  ".env", ".env.local", ".env.production", ".npmrc", ".netrc",
  "id_rsa", "id_ed25519", ".git-credentials",
]);

/**
 * Live-credential shapes. Deliberately narrow: these match issued keys, not
 * the placeholder strings a generated README legitimately contains
 * (`YOUR_API_KEY`, `sk-xxx`), so a normal project is never rejected.
 */
const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "OpenAI-style key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/ },
  { name: "Groq key", pattern: /\bgsk_[A-Za-z0-9]{40,}\b/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Slack token", pattern: /\bxox[abprs]-[0-9A-Za-z-]{20,}\b/ },
  { name: "private key block", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
];

/** NUL and other C0/C1 control characters have no place in a file path. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

export type SafetyResult =
  | { ok: true; files: GeneratedFile[]; warnings: string[] }
  | { ok: false; reason: string };

/**
 * Normalises a generated path to a repo-relative POSIX path, or returns
 * null when the path is unsafe. Rejects: absolute paths, Windows drive
 * letters, UNC paths, `..` segments, control characters and blocked
 * filenames/extensions.
 */
export function normalizeGeneratedPath(rawPath: string, limits: SafetyLimits = DEFAULT_SAFETY_LIMITS): string | null {
  if (typeof rawPath !== "string") return null;

  const path = rawPath.trim().replace(/\\/g, "/");
  if (!path || path.length > limits.maxPathLength) return null;
  if (CONTROL_CHARS.test(path)) return null;
  if (path.startsWith("/") || /^[A-Za-z]:/.test(path) || path.startsWith("//")) return null;

  const segments: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") return null; // never allow climbing out
    if (segment === "~") return null;
    segments.push(segment);
  }

  if (segments.length === 0 || segments.length > limits.maxPathDepth) return null;

  const normalized = segments.join("/");
  const basename = segments[segments.length - 1].toLowerCase();

  if (BLOCKED_BASENAMES.has(basename)) return null;
  const dot = basename.lastIndexOf(".");
  if (dot > 0 && BLOCKED_EXTENSIONS.has(basename.slice(dot))) return null;

  return normalized;
}

export function findSecretIn(content: string): string | null {
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) return name;
  }
  return null;
}

/**
 * Validates a whole generated project. Returns the normalised file list on
 * success so callers persist the cleaned paths, not the raw ones.
 */
export function validateGeneratedProject(
  files: unknown,
  limits: SafetyLimits = DEFAULT_SAFETY_LIMITS
): SafetyResult {
  if (!Array.isArray(files)) return { ok: false, reason: "the response contained no file list" };
  if (files.length === 0) return { ok: false, reason: "no files were produced" };
  if (files.length > limits.maxFiles) {
    return { ok: false, reason: `it contained ${files.length} files, over the ${limits.maxFiles} file limit` };
  }

  const warnings: string[] = [];
  const seen = new Set<string>();
  const cleaned: GeneratedFile[] = [];
  let totalBytes = 0;

  for (const entry of files) {
    if (!entry || typeof entry !== "object") return { ok: false, reason: "a file entry was not an object" };
    const { path: rawPath, content } = entry as { path?: unknown; content?: unknown };

    if (typeof rawPath !== "string" || typeof content !== "string") {
      return { ok: false, reason: "a file entry was missing its path or content" };
    }

    const path = normalizeGeneratedPath(rawPath, limits);
    if (!path) return { ok: false, reason: `an unsafe file path was rejected (${rawPath.slice(0, 60)})` };

    if (seen.has(path)) {
      warnings.push(`duplicate path skipped: ${path}`);
      continue;
    }
    seen.add(path);

    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > limits.maxFileBytes) {
      return { ok: false, reason: `${path} is larger than the ${Math.round(limits.maxFileBytes / 1000)}KB per-file limit` };
    }
    totalBytes += bytes;
    if (totalBytes > limits.maxTotalBytes) {
      return { ok: false, reason: `the project exceeds the ${Math.round(limits.maxTotalBytes / 1_000_000)}MB total size limit` };
    }

    const secret = findSecretIn(content);
    if (secret) return { ok: false, reason: `${path} appears to contain a live credential (${secret})` };

    cleaned.push({ path, content });
  }

  if (cleaned.length === 0) return { ok: false, reason: "every file was rejected" };

  return { ok: true, files: cleaned, warnings };
}
