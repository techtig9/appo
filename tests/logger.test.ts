import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { redact, redactString, formatLogLine, REDACTED } from "../src/lib/logger";

describe("redactString", () => {
  test("removes provider keys that appear inside an error body", () => {
    const body = 'Groq API error: 401 {"error":{"message":"Invalid key gsk_' + "a".repeat(48) + '"}}';
    const cleaned = redactString(body);
    assert.ok(!cleaned.includes("gsk_"), "Groq key survived redaction");
    assert.ok(cleaned.includes(REDACTED));
  });

  test("removes a Supabase-style JWT", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.abcdefghijklmnop";
    assert.ok(!redactString(`token=${jwt}`).includes(jwt));
  });

  test("removes a bearer header echoed back by an upstream", () => {
    assert.ok(!redactString("Authorization: Bearer sk-abcdefghijklmnopqrstuvwx").includes("abcdefghij"));
  });

  test("leaves ordinary text untouched", () => {
    const text = "Generation failed for app 'Habit Tracker' after 3 attempts";
    assert.equal(redactString(text), text);
  });
});

describe("redact", () => {
  test("blanks values under secret-looking keys regardless of content", () => {
    const out = redact({ apiKey: "plain-text-value", service_role_key: "x", name: "Ada" }) as Record<string, unknown>;
    assert.equal(out.apiKey, REDACTED);
    assert.equal(out.service_role_key, REDACTED);
    assert.equal(out.name, "Ada");
  });

  test("recurses into nested objects and arrays", () => {
    const out = redact({ provider: { headers: { authorization: "Bearer abc" } }, list: [{ token: "t" }] }) as any;
    assert.equal(out.provider.headers.authorization, REDACTED);
    assert.equal(out.list[0].token, REDACTED);
  });

  test("survives a circular structure instead of throwing", () => {
    const node: Record<string, unknown> = { name: "root" };
    node.self = node;
    const out = redact(node) as Record<string, unknown>;
    assert.equal(out.self, "[circular]");
  });

  test("reduces an Error to name and message without a stack", () => {
    const out = redact(new Error("boom")) as Record<string, unknown>;
    assert.deepEqual(out, { name: "Error", message: "boom" });
  });
});

describe("formatLogLine", () => {
  test("emits single-line JSON with level, time and message", () => {
    const parsed = JSON.parse(formatLogLine("warn", "something happened", { route: "/api/generate" }));
    assert.equal(parsed.level, "warn");
    assert.equal(parsed.message, "something happened");
    assert.equal(parsed.route, "/api/generate");
    assert.ok(!Number.isNaN(Date.parse(parsed.time)));
  });

  test("redacts fields on the way out", () => {
    const parsed = JSON.parse(formatLogLine("error", "upstream failed", { apiKey: "secret" }));
    assert.equal(parsed.apiKey, REDACTED);
  });
});
