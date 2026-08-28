import crypto from "node:crypto";

export type CollaboratorRole = "editor" | "viewer";

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createInviteToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: crypto.createHash("sha256").update(token).digest("hex") };
}

export function hashInviteToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function inviteExpiry(days = 7) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
