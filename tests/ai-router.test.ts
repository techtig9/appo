import test from "node:test";
import assert from "node:assert/strict";
import { __testables, type GenerateAppRequest } from "../src/lib/ai-router";

const base: GenerateAppRequest = {
  name: "Task App",
  description: "A simple task manager",
  answers: {
    platforms: ["web"],
    coreScreens: ["Home", "Tasks"],
    navigationPattern: "tabs",
    needsBackend: false,
    colorTheme: "modern",
    authentication: "none",
    database: "none",
    apiStyle: "none",
    fileStorage: false,
  },
};

test("provider order is Groq, Cerebras, OpenRouter, then optional Claude for large tasks", () => {
  const original = { ...process.env };
  process.env.GROQ_API_KEY = "g";
  process.env.CEREBRAS_API_KEY = "c";
  process.env.OPENROUTER_API_KEY = "o";
  delete process.env.ANTHROPIC_API_KEY;
  assert.deepEqual(__testables.configuredProviders(false), ["groq", "cerebras", "openrouter"]);
  process.env.ANTHROPIC_API_KEY = "a";
  assert.deepEqual(__testables.configuredProviders(true), ["groq", "cerebras", "openrouter", "anthropic"]);
  process.env = original;
});

test("Claude is not required for normal tasks", () => {
  const original = { ...process.env };
  delete process.env.GROQ_API_KEY;
  delete process.env.CEREBRAS_API_KEY;
  process.env.OPENROUTER_API_KEY = "o";
  delete process.env.ANTHROPIC_API_KEY;
  assert.deepEqual(__testables.configuredProviders(false), ["openrouter"]);
  process.env = original;
});

test("large tasks are detected from imported source and backend complexity", () => {
  const source = Array.from({ length: 10 }, (_, i) => ({ path: `src/${i}.tsx`, content: "x".repeat(3000) }));
  const result = __testables.estimateTaskSize({
    ...base,
    answers: { ...base.answers, needsBackend: true, database: "postgresql", authentication: "email_google" },
    importedProject: { source: "zip", ref: "uploaded", files: source },
  });
  assert.equal(result.large, true);
});

test("limit-like provider errors are eligible for failover", () => {
  assert.equal(__testables.isLimitOrAvailabilityError(new Error("429 rate limit exceeded")), true);
  assert.equal(__testables.isLimitOrAvailabilityError(new Error("503 service unavailable")), true);
  assert.equal(__testables.isLimitOrAvailabilityError(new Error("invalid project JSON")), false);
});
