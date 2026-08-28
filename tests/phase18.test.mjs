import assert from "node:assert/strict";
import test from "node:test";

function categoryFallback(template) {
  return template.tags?.length ? template.tags : [template.category ?? "starter"];
}

test("seed template gets a usable category tag", () => {
  assert.deepEqual(categoryFallback({ category: "fitness" }), ["fitness"]);
});

test("community template keeps existing tags", () => {
  assert.deepEqual(categoryFallback({ category: "social", tags: ["social", "mobile"] }), ["social", "mobile"]);
});

test("marketplace categories are normalized", () => {
  const categories = ["all", "fitness", "ecommerce", "productivity", "social", "booking"];
  assert.equal(categories.includes("ecommerce"), true);
});
