import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { classifyAppCategory, getAdaptiveQuestions, buildEngineeredContext } from "../src/lib/prompt-engineer";

describe("classifyAppCategory", () => {
  test("detects fitness from workout/habit keywords", () => {
    assert.equal(classifyAppCategory("A daily workout and step tracker with streaks"), "fitness");
  });

  test("detects ecommerce from shop/checkout keywords", () => {
    assert.equal(classifyAppCategory("A small shop app where customers browse products and checkout"), "ecommerce");
  });

  test("detects social from feed/follow keywords", () => {
    assert.equal(classifyAppCategory("A photo feed where friends can follow each other"), "social");
  });

  test("detects productivity from task/todo keywords", () => {
    assert.equal(classifyAppCategory("A todo list app to organize daily tasks"), "productivity");
  });

  test("detects booking from appointment/schedule keywords", () => {
    assert.equal(classifyAppCategory("Book appointments and manage a schedule"), "booking");
  });

  test("detects education from course/quiz keywords", () => {
    assert.equal(classifyAppCategory("A course app with quizzes and flashcards for students"), "education");
  });

  test("detects finance from budget/expense keywords", () => {
    assert.equal(classifyAppCategory("Track my monthly budget and expenses"), "finance");
  });

  test("falls back to general when nothing matches", () => {
    assert.equal(classifyAppCategory("An app that shows the weather forecast"), "general");
  });

  test("picks the category with the strongest keyword match when a description overlaps categories", () => {
    // Mentions "schedule" (booking, 1 hit) but "workout"+"gym"+"steps" (fitness, 3 hits)
    assert.equal(classifyAppCategory("A workout app with a gym schedule and step tracking"), "fitness");
  });

  test("is case-insensitive", () => {
    assert.equal(classifyAppCategory("SHOP for PRODUCTS and add to CART"), "ecommerce");
  });
});

describe("getAdaptiveQuestions", () => {
  test("always includes the base questions plus category-specific ones", () => {
    const { category, questions } = getAdaptiveQuestions("A workout tracker");
    assert.equal(category, "fitness");
    const ids = questions.map((q) => q.id);
    assert.ok(ids.includes("platforms"), "base question missing");
    assert.ok(ids.includes("navigation"), "base question missing");
    assert.ok(ids.includes("backend"), "base question missing");
    assert.ok(ids.includes("tracking_unit"), "fitness-specific question missing");
    assert.ok(ids.includes("reminders"), "fitness-specific question missing");
  });

  test("different descriptions produce different question sets — the actual point of this feature", () => {
    const fitness = getAdaptiveQuestions("A daily workout tracker");
    const ecommerce = getAdaptiveQuestions("A shop where people buy products");
    const fitnessIds = fitness.questions.map((q) => q.id);
    const ecommerceIds = ecommerce.questions.map((q) => q.id);
    assert.notDeepEqual(fitnessIds, ecommerceIds);
    assert.ok(ecommerceIds.includes("catalog_size"));
    assert.ok(!fitnessIds.includes("catalog_size"));
  });

  test("general fallback still returns a usable question set", () => {
    const { questions } = getAdaptiveQuestions("An app for tracking the weather");
    assert.ok(questions.length >= 3); // 3 base + at least 1 general question
  });
});

describe("buildEngineeredContext", () => {
  test("includes the detected category and every answer", () => {
    const context = buildEngineeredContext("fitness", { tracking_unit: "Habits/streaks", reminders: "Yes" });
    assert.match(context, /Detected app category: fitness/);
    assert.match(context, /tracking_unit: Habits\/streaks/);
    assert.match(context, /reminders: Yes/);
  });

  test("handles an empty answers object without throwing", () => {
    assert.doesNotThrow(() => buildEngineeredContext("general", {}));
  });
});
