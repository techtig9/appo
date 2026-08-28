import test from "node:test";
import assert from "node:assert/strict";
import { verifyProject } from "../src/lib/project-verifier";

test("passes a normal project without hard-coded secrets", () => {
  const result = verifyProject([
    { path: "App.tsx", content: "export default function App(){ return null }" },
    { path: ".env.example", content: "API_KEY=" },
  ]);
  assert.equal(result.status, "passed");
  assert.ok(result.score >= 90);
});

test("flags a possible private key", () => {
  const result = verifyProject([{ path: "config.ts", content: "-----BEGIN PRIVATE KEY-----" }]);
  assert.equal(result.status, "failed");
  assert.ok(result.errors.some((e) => e.includes("secret")));
});

test("warns about unsafe process execution", () => {
  const result = verifyProject([{ path: "App.tsx", content: "const x = eval(input)" }]);
  assert.ok(result.warnings.length > 0);
  assert.ok(result.checks.some((c) => c.id === "unsafe" && c.status === "warning"));
});
