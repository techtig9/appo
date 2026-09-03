import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { esc, describeDevice, renderLayout, renderText, securityFacts } from "../src/lib/email/render";
import {
  welcomeEmail,
  loginAlertEmail,
  passwordResetEmail,
  passwordChangedEmail,
  paymentFailedEmail,
  teamInvitationEmail,
  generationCompletedEmail,
} from "../src/lib/email/templates";
import {
  signInDedupeKey,
  welcomeDedupeKey,
  isPlausibleEmail,
  SIGNIN_DEDUPE_WINDOW_MS,
} from "../src/lib/email/dedupe";

const context = { at: new Date("2026-03-01T09:30:00Z"), ip: "203.0.113.10", userAgent: null, device: "Chrome on macOS" };

describe("esc", () => {
  // A project name is user-controlled and ends up inside the mail body.
  test("escapes markup so a project name cannot inject HTML", () => {
    assert.equal(esc(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    assert.equal(esc("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");
  });

  test("renders null and undefined as empty rather than the words", () => {
    assert.equal(esc(null), "");
    assert.equal(esc(undefined), "");
  });
});

describe("describeDevice", () => {
  test("summarises common clients", () => {
    assert.equal(
      describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
      "Chrome on macOS"
    );
    assert.equal(
      describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"),
      "Safari on iOS"
    );
  });

  test("returns null rather than guessing when there is nothing to go on", () => {
    assert.equal(describeDevice(null), null);
    assert.equal(describeDevice(""), null);
  });

  test("prefers Edge over the Chrome token Edge also sends", () => {
    assert.equal(describeDevice("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0"), "Edge on Windows");
  });
});

describe("email layout", () => {
  test("produces a complete HTML document with a preheader", () => {
    const html = renderLayout({ preheader: "Preview text", heading: "Hello", bodyHtml: "<p>Body</p>" });
    assert.match(html, /^<!doctype html>/i);
    assert.match(html, /Preview text/);
    assert.match(html, /<title>Hello<\/title>/);
  });

  test("uses tables and inline styles, not modern layout that mail clients drop", () => {
    const html = renderLayout({ preheader: "x", heading: "Hello", bodyHtml: "<p>Body</p>" });
    assert.match(html, /<table role="presentation"/);
    assert.ok(!/display:\s*flex/.test(html), "flexbox is unreliable in Outlook");
    assert.ok(!/<link[^>]+stylesheet/.test(html), "external stylesheets are stripped by most clients");
  });

  test("plain-text alternative spells out the link instead of hiding it", () => {
    const text = renderText({ heading: "Hello", lines: ["Body"], button: { label: "Open", href: "https://appo.app/x" } });
    assert.match(text, /Open: https:\/\/appo\.app\/x/);
  });
});

describe("securityFacts", () => {
  test("always includes when, and includes device and IP when known", () => {
    const facts = securityFacts(context);
    const labels = facts.map((f) => f.label);
    assert.ok(labels.includes("When"));
    assert.ok(labels.includes("Device"));
    assert.ok(labels.includes("IP address"));
  });

  test("omits what it does not know rather than printing 'unknown'", () => {
    const facts = securityFacts({ at: new Date(), ip: null, userAgent: null });
    assert.deepEqual(facts.map((f) => f.label), ["When"]);
  });
});

describe("templates", () => {
  const all = [
    welcomeEmail({ name: "Ada" }),
    loginAlertEmail({ name: "Ada", provider: "google", context }),
    passwordResetEmail({ resetUrl: "https://appo.app/reset", context }),
    passwordChangedEmail({ context }),
    paymentFailedEmail({ plan: "Pro" }),
    teamInvitationEmail({ inviterName: "Ada", appName: "Habit", role: "editor", acceptUrl: "https://appo.app/i/1" }),
    generationCompletedEmail({ appName: "Habit", appId: "abc", summary: "Built 12 screens." }),
  ];

  test("every template returns a non-empty subject, html and text", () => {
    for (const email of all) {
      assert.ok(email.subject.length > 0 && email.subject.length < 120, `bad subject: ${email.subject}`);
      assert.match(email.html, /<!doctype html>/i);
      assert.ok(email.text.length > 0);
    }
  });

  test("no template leaks an unresolved template placeholder", () => {
    for (const email of all) {
      assert.ok(!/\{\{|\[object Object\]|undefined/.test(email.subject), `subject: ${email.subject}`);
      assert.ok(!/\[object Object\]/.test(email.html));
    }
  });

  test("the Google and password sign-in alerts share one template shape", () => {
    const google = loginAlertEmail({ provider: "google", context });
    const password = loginAlertEmail({ provider: "password", context });
    assert.match(google.html, /Google sign-in/);
    assert.match(password.html, /Password sign-in/);
    // Same template id and structure — the requirement is one logical
    // "you signed in" event, not two different-looking emails.
    assert.equal(google.subject, password.subject);
  });

  test("a new-device sign-in is titled differently from a routine one", () => {
    const routine = loginAlertEmail({ provider: "password", context });
    const newDevice = loginAlertEmail({ provider: "password", isNewDevice: true, context });
    assert.notEqual(routine.subject, newDevice.subject);
  });

  test("a hostile app name is escaped in the body", () => {
    const email = generationCompletedEmail({
      appName: '<script>alert(1)</script>',
      appId: "abc",
      summary: "ok",
    });
    assert.ok(!email.html.includes("<script>alert(1)</script>"));
    assert.match(email.html, /&lt;script&gt;/);
  });
});

describe("sign-in de-duplication", () => {
  const base = { userId: "u1", provider: "password" as const, ip: "203.0.113.1", userAgent: "UA/1.0" };

  // Supabase can emit several auth state changes for one sign-in, and a
  // refresh right afterwards looks identical server-side. All of those
  // must collapse into a single email.
  test("repeat signals within the window share a key", () => {
    const now = 1_700_000_000_000;
    assert.equal(signInDedupeKey({ ...base, now }), signInDedupeKey({ ...base, now: now + 60_000 }));
  });

  test("a sign-in in a later window gets its own key", () => {
    const now = 1_700_000_000_000;
    assert.notEqual(
      signInDedupeKey({ ...base, now }),
      signInDedupeKey({ ...base, now: now + SIGNIN_DEDUPE_WINDOW_MS * 2 })
    );
  });

  test("a different device or provider is a different event", () => {
    const now = 1_700_000_000_000;
    assert.notEqual(signInDedupeKey({ ...base, now }), signInDedupeKey({ ...base, now, userAgent: "Other/2.0" }));
    assert.notEqual(signInDedupeKey({ ...base, now }), signInDedupeKey({ ...base, now, provider: "google" }));
  });

  test("the key never contains the raw IP or user agent", () => {
    const key = signInDedupeKey({ ...base, now: 1_700_000_000_000 });
    assert.ok(!key.includes("203.0.113.1"));
    assert.ok(!key.includes("UA/1.0"));
  });

  test("the welcome email is keyed once per user, for all time", () => {
    assert.equal(welcomeDedupeKey("u1"), welcomeDedupeKey("u1"));
    assert.notEqual(welcomeDedupeKey("u1"), welcomeDedupeKey("u2"));
  });
});

describe("isPlausibleEmail", () => {
  test("accepts ordinary addresses", () => {
    assert.equal(isPlausibleEmail("ada@example.com"), true);
    assert.equal(isPlausibleEmail("ada.lovelace+appo@sub.example.co.uk"), true);
  });

  test("rejects obvious rubbish before a wasted API call", () => {
    for (const bad of ["", "ada", "ada@", "@example.com", "ada@example", "ada example@x.com"]) {
      assert.equal(isPlausibleEmail(bad), false, bad);
    }
  });
});
