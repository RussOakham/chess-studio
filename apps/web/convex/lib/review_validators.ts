import { v } from "convex/values";

const MAX_KEY_MOMENTS = 20;
const MAX_SUGGESTIONS = 10;
const MAX_MOVE_ANNOTATIONS = 500;
const MAX_EVALUATIONS = 500;
const MAX_SUMMARY_LENGTH = 10_000;
/** LLM narrative cap (separate from rule-based `summary`). */
const MAX_AI_SUMMARY_LENGTH = 12_000;

function newAiSummaryClaimToken(): string {
  return globalThis.crypto.randomUUID();
}

const aiSummaryMetaValidator = v.object({
  model: v.string(),
  generatedAt: v.number(),
  promptVersion: v.optional(v.number()),
});

const moveAnnotationValidator = v.object({
  moveNumber: v.number(),
  type: v.union(
    v.literal("blunder"),
    v.literal("mistake"),
    v.literal("inaccuracy"),
    v.literal("good"),
    v.literal("best"),
    v.literal("book")
  ),
  bestMoveSan: v.optional(v.string()),
  bestMoveUci: v.optional(v.string()),
  bookOpeningEco: v.optional(v.string()),
  bookOpeningName: v.optional(v.string()),
});

export {
  MAX_AI_SUMMARY_LENGTH,
  MAX_EVALUATIONS,
  MAX_KEY_MOMENTS,
  MAX_MOVE_ANNOTATIONS,
  MAX_SUGGESTIONS,
  MAX_SUMMARY_LENGTH,
  aiSummaryMetaValidator,
  moveAnnotationValidator,
  newAiSummaryClaimToken,
};
