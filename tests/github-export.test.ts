import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { sanitizeRepoName } from "../src/lib/github-export";

describe("sanitizeRepoName", () => {
  test("lowercases and hyphenates spaces", () => {
    assert.equal(sanitizeRepoName("Tab Tracker"), "tab-tracker");
  });

  test("strips characters GitHub repo names don't allow", () => {
    assert.equal(sanitizeRepoName("My App!! (v2)"), "my-app-v2");
  });

  test("trims leading/trailing hyphens produced by stripped characters", () => {
    assert.equal(sanitizeRepoName("!!! Cool App !!!"), "cool-app");
  });

  test("falls back to a default name when input sanitizes to empty", () => {
    assert.equal(sanitizeRepoName("!!!"), "appo-export");
  });

  test("truncates extremely long names to 100 chars", () => {
    const long = "a".repeat(200);
    assert.equal(sanitizeRepoName(long).length, 100);
  });
});
