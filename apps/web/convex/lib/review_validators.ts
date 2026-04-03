import { v } from "convex/values";

export const MAX_KEY_MOMENTS = 20;
export const MAX_SUGGESTIONS = 10;
export const MAX_MOVE_ANNOTATIONS = 500;
export const MAX_EVALUATIONS = 500;
export const MAX_SUMMARY_LENGTH = 10_000;
/** LLM narrative cap (separate from rule-based `summary`). */
export const MAX_AI_SUMMARY_LENGTH = 12_000;

export function newAiSummaryClaimToken(): string {
  return globalThis.crypto.randomUUID();
}

export const aiSummaryMetaValidator = v.object({
  model: v.string(),
  generatedAt: v.number(),
  promptVersion: v.optional(v.number()),
});

export const moveAnnotationValidator = v.object({
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
