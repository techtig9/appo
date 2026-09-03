import type { RenderedEmail, SecurityContext } from "./types";

/**
 * Email HTML is not web HTML. Outlook renders with Word's engine, Gmail
 * strips <style> in some clients, and flexbox/grid are unreliable
 * everywhere. So: tables, inline styles, no external CSS, no web fonts,
 * 600px fixed width, and colours that survive a dark-mode inversion.
 *
 * Everything here is pure string building — no dependency, no network —
 * so every template is snapshot-testable offline.
 */

const BRAND = {
  name: "Appo",
  tagline: "Build apps with AI. Ship ideas faster.",
  primary: "#7C5CFF",
  ink: "#13151A",
  body: "#41464F",
  muted: "#717784",
  border: "#E5E7EB",
  surface: "#FFFFFF",
  canvas: "#F4F4F7",
};

export function appUrl(path = "/"): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function supportEmail(): string {
  return process.env.APPO_SUPPORT_EMAIL ?? "support@appo.app";
}

/**
 * Escapes interpolated values. Every template passes user-controlled text
 * (a project name, a display name, an inviter's email) through here — an
 * unescaped app name containing markup would otherwise be injected into
 * the mail body.
 */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailButton {
  label: string;
  href: string;
}

export interface EmailLayoutOptions {
  preheader: string;
  heading: string;
  /** Already-escaped HTML paragraphs. Use `p()` to build them. */
  bodyHtml: string;
  button?: EmailButton;
  /** Rendered as a subdued key/value block, e.g. sign-in details. */
  facts?: { label: string; value: string }[];
  footerNote?: string;
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.body};">${text}</p>`;
}

function factsTable(facts: { label: string; value: string }[]): string {
  const rows = facts
    .map(
      (fact) => `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:${BRAND.muted};width:120px;">${esc(fact.label)}</td>
          <td style="padding:6px 0;font-size:13px;color:${BRAND.ink};font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${esc(
            fact.value
          )}</td>
        </tr>`
    )
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="margin:0 0 20px;border:1px solid ${BRAND.border};border-radius:10px;padding:10px 14px;background:${BRAND.canvas};">
      ${rows}
    </table>`;
}

function buttonHtml(button: EmailButton): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;">
      <tr>
        <td style="border-radius:10px;background:${BRAND.primary};">
          <a href="${esc(button.href)}"
             style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${esc(button.label)}
          </a>
        </td>
      </tr>
    </table>`;
}

export function renderLayout(options: EmailLayoutOptions): string {
  const preheader = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(options.preheader)}</div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${esc(options.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BRAND.canvas};font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${preheader}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.canvas};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 0;">
                <a href="${esc(appUrl("/"))}" style="text-decoration:none;color:${BRAND.ink};font-size:18px;font-weight:700;letter-spacing:-0.01em;">
                  ${BRAND.name}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 8px;">
                <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:650;color:${BRAND.ink};">${esc(
                  options.heading
                )}</h1>
                ${options.bodyHtml}
                ${options.facts?.length ? factsTable(options.facts) : ""}
                ${options.button ? buttonHtml(options.button) : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <hr style="border:none;border-top:1px solid ${BRAND.border};margin:8px 0 16px;" />
                <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                  ${options.footerNote ? esc(options.footerNote) + "<br />" : ""}
                  Need help? Reply to this email or contact
                  <a href="mailto:${esc(supportEmail())}" style="color:${BRAND.primary};">${esc(supportEmail())}</a>.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.muted};">
                  ${BRAND.name} — ${BRAND.tagline}
                  &middot; <a href="${esc(appUrl("/dashboard/settings"))}" style="color:${BRAND.muted};">Email preferences</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Plain-text counterpart. Kept deliberately simple and link-explicit. */
export function renderText(parts: {
  heading: string;
  lines: string[];
  button?: EmailButton;
  facts?: { label: string; value: string }[];
  footerNote?: string;
}): string {
  const out = [parts.heading, "", ...parts.lines];
  if (parts.facts?.length) {
    out.push("");
    for (const fact of parts.facts) out.push(`${fact.label}: ${fact.value}`);
  }
  if (parts.button) {
    out.push("", `${parts.button.label}: ${parts.button.href}`);
  }
  out.push("", "—");
  if (parts.footerNote) out.push(parts.footerNote);
  out.push(`Need help? Contact ${supportEmail()}`, `Appo — ${BRAND.tagline}`, appUrl("/"));
  return out.join("\n");
}

/**
 * Turns a raw User-Agent into something a human can recognise in a
 * security email. Best-effort by design: this is for the reader's benefit,
 * never for an authorisation decision.
 */
export function describeDevice(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const ua = userAgent.slice(0, 400);

  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : null;

  const platform =
    /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Windows NT/.test(ua) ? "Windows"
    : /Linux/.test(ua) ? "Linux"
    : null;

  if (browser && platform) return `${browser} on ${platform}`;
  return browser ?? platform ?? null;
}

export function securityFacts(context: SecurityContext): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [
    {
      label: "When",
      value: context.at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC",
    },
  ];
  const device = context.device ?? describeDevice(context.userAgent);
  if (device) facts.push({ label: "Device", value: device });
  if (context.location) facts.push({ label: "Location", value: context.location });
  // The IP is shown to the account owner about their own sign-in, which is
  // standard practice and helps them recognise an unfamiliar session.
  if (context.ip) facts.push({ label: "IP address", value: context.ip });
  return facts;
}

export function rendered(subject: string, html: string, text: string): RenderedEmail {
  return { subject, html, text };
}
