import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { __testables, type GenerateAppRequest } from "../src/lib/gemini";

describe("buildPrompt (Gemini request construction)", () => {
  const baseRequest: GenerateAppRequest = {
    name: "TabTracker",
    description: "A simple habit tracker with daily reminders.",
    answers: {
      platforms: ["ios", "android"],
      coreScreens: ["Home", "AddHabit", "Stats"],
      navigationPattern: "tabs",
      needsBackend: true,
      colorTheme: "teal",
      authentication: "email",
      database: "postgresql",
      apiStyle: "rest",
      fileStorage: false,
    },
  };

  test("from-scratch prompt includes every follow-up answer", () => {
    const prompt = __testables.buildPrompt(baseRequest);
    assert.match(prompt, /generating a brand-new Expo\/React Native project/);
    assert.match(prompt, /TabTracker/);
    assert.match(prompt, /ios, android/);
    assert.match(prompt, /Home, AddHabit, Stats/);
    assert.match(prompt, /tabs/);
    assert.match(prompt, /teal/);
  });

  test("import-and-extend prompt references the imported project instead of 'from scratch'", () => {
    const prompt = __testables.buildPrompt({
      ...baseRequest,
      importedProject: { source: "github", ref: "github.com/user/tabtracker" },
    });
    assert.match(prompt, /extending an existing Expo\/React Native project/);
    assert.match(prompt, /github.com\/user\/tabtracker/);
    assert.doesNotMatch(prompt, /brand-new Expo/);
  });

  test("prompt always requests strict JSON output with no prose", () => {
    const prompt = __testables.buildPrompt(baseRequest);
    assert.match(prompt, /No prose outside the JSON/);
  });
});
