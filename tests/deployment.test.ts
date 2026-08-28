import test from "node:test";
import assert from "node:assert/strict";
import { generateShareSlug } from "../src/lib/share-slug";

test("deployment slug is URL safe and stable in length", () => {
  const slug = generateShareSlug(12, () => 0.5);
  assert.equal(slug.length, 12);
  assert.match(slug, /^[a-z0-9]+$/);
});

test("deployment URL uses the public preview route", () => {
  const origin = "https://appo.example";
  const slug = "abc123xyz";
  const url = `${origin}/preview/${slug}`;
  assert.equal(new URL(url).pathname, "/preview/abc123xyz");
});
