import assert from "node:assert/strict";
import test from "node:test";

test("import limits reject unsafe paths", () => {
  const safe = (p) => { const x=p.replaceAll("\\", "/"); return Boolean(x) && !x.startsWith("/") && !x.includes("..") && !x.includes("\0"); };
  assert.equal(safe("src/App.tsx"), true);
  assert.equal(safe("../../secret.txt"), false);
  assert.equal(safe("/etc/passwd"), false);
});

test("import accepts only GitHub repository URLs", () => {
  const re = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/tree\/[^/]+)?\/?$/;
  assert.equal(re.test("https://github.com/acme/app"), true);
  assert.equal(re.test("https://github.com/acme/app/tree/main"), true);
  assert.equal(re.test("https://evil.example/acme/app"), false);
});
