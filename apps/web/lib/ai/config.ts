/**
 * Shared defaults for AI-assisted features (game summary, future key-moment text, etc.).
 * Convex actions and route handlers should read these; keep API keys out of this file.
 *
 * Model strings use Vercel AI Gateway form `provider/model` when using the gateway.
 */

/** Env override: `AI_GAME_SUMMARY_MODEL` (set in Convex + Vercel for actions). */
const DEFAULT_AI_SUMMARY_MODEL = "openai/gpt-4o-mini";

function getAiSummaryModelId(): string {
  return process.env.AI_GAME_SUMMARY_MODEL ?? DEFAULT_AI_SUMMARY_MODEL;
}

/** Wall-clock budget for a single generate call (Convex actions also have platform limits). */
const AI_GENERATE_TIMEOUT_MS = 60_000;

/** Max completion tokens for narrative summaries (tune per model). */
const AI_SUMMARY_MAX_OUTPUT_TOKENS = 2048;

export { GAME_SUMMARY_PROMPT_VERSION } from "@/lib/ai/prompts/game-summary";

export {
  AI_GENERATE_TIMEOUT_MS,
  AI_SUMMARY_MAX_OUTPUT_TOKENS,
  DEFAULT_AI_SUMMARY_MODEL,
  getAiSummaryModelId,
};
