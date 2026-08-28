import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildChatbotSystemPrompt, buildFallbackResponse } from "../src/lib/chatbot";

describe("buildChatbotSystemPrompt", () => {
  test("always positions the bot as an appo-specific advisor, not a general assistant", () => {
    const prompt = buildChatbotSystemPrompt(true);
    assert.match(prompt, /appo Assistant/);
    assert.match(prompt, /React Native\/Expo/);
  });

  test("always states what appo can't do yet, so the bot can't overclaim", () => {
    const prompt = buildChatbotSystemPrompt(true);
    assert.match(prompt, /App Store\/Play Store submission is queued, not yet live/);
  });

  test("unauthenticated visitors get an explicit no-action-taking instruction", () => {
    const prompt = buildChatbotSystemPrompt(false);
    assert.match(prompt, /hasn't signed up yet/);
    assert.match(prompt, /cannot take any action on their behalf/);
  });

  test("authenticated users do NOT get the no-action disclaimer (it wouldn't be true for them)", () => {
    const prompt = buildChatbotSystemPrompt(true);
    assert.doesNotMatch(prompt, /hasn't signed up yet/);
  });
});

describe("buildFallbackResponse", () => {
  test("never throws and always returns a non-empty string", () => {
    assert.ok(buildFallbackResponse(true).length > 0);
    assert.ok(buildFallbackResponse(false).length > 0);
  });

  test("logged-out fallback nudges toward signup, logged-in fallback doesn't repeat that pitch", () => {
    const loggedOut = buildFallbackResponse(false);
    const loggedIn = buildFallbackResponse(true);
    assert.match(loggedOut, /sign up/);
    assert.doesNotMatch(loggedIn, /sign up/);
  });
});
