/**
 * Backwards-compatible export surface for Appo's generation pipeline.
 * The implementation now lives in ai-router.ts and uses:
 * Groq -> Cerebras -> OpenRouter -> optional Anthropic Claude for large tasks.
 */
export {
  generateApp,
  chatWithAI,
  __testables,
  type GenerateAppRequest,
  type GeneratedProject,
  type GeneratorAnswers,
} from "./ai-router";
