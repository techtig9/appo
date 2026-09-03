import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

/**
 * Guards the test runner's own file discovery.
 *
 * This suite exists because the same defect has now bitten twice:
 *
 *   1. The original script globbed `tests/**` + `/*.test.ts` unquoted. Bash
 *      without `globstar` treats `**` as `*`, so it expanded to
 *      `tests/*` + `/*.test.ts` — which matches nothing. npm passed the
 *      literal string through, and Node happened to glob it itself, which
 *      silently skipped the five `.mjs` suites for as long as they existed.
 *
 *   2. The fix quoted the globs so the shell would leave them alone — which
 *      works only on Node 21+, where `--test` expands globs itself. CI on
 *      Node 20 got the literal string and failed with "Could not find".
 *
 * Both failure modes are invisible in the ordinary case: the suite reports
 * a healthy pass count while quietly running fewer files than exist. So the
 * package script now uses flat, shell-expandable patterns, and this test
 * asserts the two invariants that keeps correct.
 */

const TESTS_DIR = new URL(".", import.meta.url).pathname;

/** Every `*.test.*` file under tests/, at any depth. */
function findTestFiles(dir: string, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...findTestFiles(full, `${prefix}${entry}/`));
    } else if (/\.test\.(ts|mjs|js|cjs)$/.test(entry)) {
      found.push(`${prefix}${entry}`);
    }
  }
  return found;
}

describe("test discovery", () => {
  // The package script matches `tests/*.test.ts tests/*.test.mjs` — one
  // level, no recursion. A file added in a subdirectory would never run,
  // and nothing else would say so.
  test("no test file is hidden in a subdirectory the runner cannot see", () => {
    const nested = findTestFiles(TESTS_DIR).filter((path) => path.includes("/"));
    assert.deepEqual(
      nested,
      [],
      `These test files are nested and will NOT be run by the current npm test script:\n` +
        `  ${nested.join("\n  ")}\n` +
        `Either move them to tests/ or update the "test" script in package.json.`
    );
  });

  test("the runner covers both .ts and .mjs suites", () => {
    const script = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts.test;

    assert.match(script, /tests\/\*\.test\.ts/, "the test script must include the .ts suites");
    assert.match(script, /tests\/\*\.test\.mjs/, "the test script must include the .mjs suites");
  });

  // Quoting is what broke CI: the shell leaves a quoted glob alone, and
  // Node only expands globs in --test arguments from v21 onward, so on the
  // Node 18/20 this project's `engines` field still supports it is passed
  // through as a literal path and not found.
  test("the globs are unquoted so the shell expands them on every supported Node", () => {
    const script = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts.test;

    assert.ok(
      !/["']tests\//.test(script),
      `The test globs must not be quoted — a quoted glob reaches Node literally and only Node 21+ expands it.\nGot: ${script}`
    );
  });
});
