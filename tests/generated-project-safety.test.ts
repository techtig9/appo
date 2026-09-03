import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeGeneratedPath,
  validateGeneratedProject,
  findSecretIn,
  DEFAULT_SAFETY_LIMITS,
} from "../src/lib/generated-project-safety";

const okFile = { path: "src/App.tsx", content: "export default function App() { return null; }" };

describe("normalizeGeneratedPath", () => {
  test("keeps a normal project-relative path", () => {
    assert.equal(normalizeGeneratedPath("src/screens/Home.tsx"), "src/screens/Home.tsx");
  });

  test("normalises redundant segments and backslashes", () => {
    assert.equal(normalizeGeneratedPath("./src//components\\Card.tsx"), "src/components/Card.tsx");
  });

  // The reason this module exists: these paths are written into a ZIP the
  // user unpacks locally. A `..` escapes the extraction directory.
  test("rejects parent-directory traversal", () => {
    assert.equal(normalizeGeneratedPath("../../../etc/passwd"), null);
    assert.equal(normalizeGeneratedPath("src/../../secrets.txt"), null);
    assert.equal(normalizeGeneratedPath("src/..\\..\\secrets.txt"), null);
  });

  test("rejects absolute, drive-letter and UNC paths", () => {
    assert.equal(normalizeGeneratedPath("/etc/shadow"), null);
    assert.equal(normalizeGeneratedPath("C:/Windows/System32/evil.dll"), null);
    assert.equal(normalizeGeneratedPath("//server/share/file"), null);
  });

  test("rejects a NUL byte in the path", () => {
    assert.equal(normalizeGeneratedPath("src/App\u0000.tsx"), null);
  });

  test("rejects executables and credential filenames", () => {
    assert.equal(normalizeGeneratedPath("scripts/install.exe"), null);
    assert.equal(normalizeGeneratedPath("setup.ps1"), null);
    assert.equal(normalizeGeneratedPath(".env"), null);
    assert.equal(normalizeGeneratedPath("config/.env.production"), null);
    assert.equal(normalizeGeneratedPath("keys/id_rsa"), null);
  });

  test("rejects paths that are too long or too deep", () => {
    assert.equal(normalizeGeneratedPath(`${"a".repeat(320)}.ts`), null);
    assert.equal(normalizeGeneratedPath(Array(20).fill("dir").join("/") + "/f.ts"), null);
  });
});

describe("findSecretIn", () => {
  test("flags issued credentials", () => {
    assert.equal(findSecretIn(`const key = "AKIAIOSFODNN7EXAMPLE";`), "AWS access key");
    assert.ok(findSecretIn("-----BEGIN RSA PRIVATE KEY-----\nabc\n"));
  });

  // A generated README saying `OPENAI_API_KEY=sk-xxx` is normal and must
  // not fail a whole generation.
  test("ignores obvious placeholders", () => {
    assert.equal(findSecretIn("OPENAI_API_KEY=your-api-key-here"), null);
    assert.equal(findSecretIn("GROQ_API_KEY=sk-xxx"), null);
    assert.equal(findSecretIn("Set EXPO_PUBLIC_API_URL in your .env file."), null);
  });
});

describe("validateGeneratedProject", () => {
  test("accepts a normal project and returns normalised paths", () => {
    const result = validateGeneratedProject([{ path: "./src/App.tsx", content: "x" }]);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.files[0].path, "src/App.tsx");
  });

  test("rejects a non-array, an empty list and a bad entry", () => {
    assert.equal(validateGeneratedProject(null).ok, false);
    assert.equal(validateGeneratedProject([]).ok, false);
    assert.equal(validateGeneratedProject([{ path: "a.ts" }]).ok, false);
  });

  test("rejects a project containing a traversal path", () => {
    const result = validateGeneratedProject([okFile, { path: "../../evil.sh", content: "rm -rf /" }]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /unsafe file path/);
  });

  test("rejects a project that embeds a live credential", () => {
    const result = validateGeneratedProject([{ path: "src/api.ts", content: 'const k = "AKIAIOSFODNN7EXAMPLE";' }]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /credential/);
  });

  test("enforces the file-count ceiling", () => {
    const files = Array.from({ length: DEFAULT_SAFETY_LIMITS.maxFiles + 1 }, (_, i) => ({
      path: `src/f${i}.ts`,
      content: "x",
    }));
    const result = validateGeneratedProject(files);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /file limit/);
  });

  test("enforces the per-file size ceiling", () => {
    const result = validateGeneratedProject([{ path: "src/big.ts", content: "x".repeat(1_000_001) }]);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /per-file limit/);
  });

  test("enforces the total size ceiling across files", () => {
    const files = Array.from({ length: 30 }, (_, i) => ({ path: `src/f${i}.ts`, content: "x".repeat(900_000) }));
    const result = validateGeneratedProject(files);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /total size limit/);
  });

  test("de-duplicates paths that normalise to the same file rather than failing", () => {
    const result = validateGeneratedProject([
      { path: "src/App.tsx", content: "first" },
      { path: "./src/App.tsx", content: "second" },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.files.length, 1);
      assert.equal(result.files[0].content, "first");
      assert.equal(result.warnings.length, 1);
    }
  });
});
