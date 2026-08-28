import test from "node:test";
import assert from "node:assert/strict";

function validateInstruction(value: unknown) {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.length >= 4 && v.length <= 2000;
}

test("phase 16 edit validation accepts a focused request", () => {
  assert.equal(validateInstruction("Add a settings screen"), true);
  assert.equal(validateInstruction("  Add dark mode  "), true);
});

test("phase 16 edit validation rejects empty and oversized requests", () => {
  assert.equal(validateInstruction(""), false);
  assert.equal(validateInstruction("abc"), false);
  assert.equal(validateInstruction("x".repeat(2001)), false);
});
