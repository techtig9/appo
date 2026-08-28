import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { generateShareSlug } from "../src/lib/share-slug";

describe("generateShareSlug", () => {
  test("defaults to a 10-character slug", () => {
    assert.equal(generateShareSlug().length, 10);
  });

  test("respects a custom length", () => {
    assert.equal(generateShareSlug(6).length, 6);
  });

  test("only uses lowercase letters and digits — safe for a URL with no encoding", () => {
    const slug = generateShareSlug(200);
    assert.match(slug, /^[a-z0-9]+$/);
  });

  test("is deterministic when given a fixed random source (for testability)", () => {
    const fixedRandom = () => 0; // always picks the first character
    const slug = generateShareSlug(5, fixedRandom);
    assert.equal(slug, "aaaaa");
  });

  test("two real calls are virtually never equal (sanity check on randomness wiring)", () => {
    const a = generateShareSlug();
    const b = generateShareSlug();
    assert.notEqual(a, b);
  });
});
