import { v } from "convex/values";

/**
 * Convex queries and mutations for game reviews (post-game analysis).
 * Auth: caller must own the game (ownedGame* wrappers). Only completed games can have reviews saved.
 */
import {
  AI_SUMMARY_COOLDOWN_MS,
  AI_SUMMARY_GENERATION_LOCK_MS,
} from "../lib/ai/config";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { ownedGameMutation, ownedGameQuery } from "./lib/authed_functions";

const MAX_KEY_MOMENTS = 20;
const MAX_SUGGESTIONS = 10;
const MAX_MOVE_ANNOTATIONS = 500;
const MAX_EVALUATIONS = 500;
const MAX_SUMMARY_LENGTH = 10_000;
/** LLM narrative cap (separate from rule-based `summary`). */
const MAX_AI_SUMMARY_LENGTH = 12_000;

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

const getByGameId = ownedGameQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("game_reviews"),
      _creationTime: v.number(),
      gameId: v.id("games"),
      summary: v.string(),
      evaluations: v.optional(v.array(v.number())),
      keyMoments: v.optional(v.array(v.string())),
      suggestions: v.optional(v.array(v.string())),
      openingNameLichess: v.optional(v.string()),
      moveAnnotations: v.optional(v.array(moveAnnotationValidator)),
      aiSummary: v.optional(v.string()),
      aiSummaryMeta: v.optional(aiSummaryMetaValidator),
      aiSummaryGenerationStartedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async ({ db }, args) => {
    const review = await db
      .query("game_reviews")
      .withIndex("by_gameId", (indexQuery) =>
        indexQuery.eq("gameId", args.gameId)
      )
      .unique();
    return review;
  },
});

/** Internal: upsert game review after auth and validation. */
async function saveReviewInternal(
  ctx: MutationCtx,
  gameId: Id<"games">,
  payload: {
    summary: string;
    evaluations: number[];
    keyMoments: string[];
    suggestions: string[];
    moveAnnotations: {
      moveNumber: number;
      type: "blunder" | "mistake" | "inaccuracy" | "good" | "best" | "book";
      bestMoveSan?: string;
      bestMoveUci?: string;
      bookOpeningEco?: string;
      bookOpeningName?: string;
    }[];
    /** `undefined` = leave unchanged; `null` = clear stored value. */
    openingNameLichess?: string | null;
  }
): Promise<Id<"game_reviews">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("game_reviews")
    .withIndex("by_gameId", (indexQuery) => indexQuery.eq("gameId", gameId))
    .unique();

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      summary: payload.summary,
      evaluations: payload.evaluations,
      keyMoments: payload.keyMoments,
      suggestions: payload.suggestions,
      moveAnnotations: payload.moveAnnotations,
      ...(payload.openingNameLichess !== undefined
        ? {
            openingNameLichess:
              payload.openingNameLichess === null
                ? undefined
                : payload.openingNameLichess,
          }
        : {}),
    });
    return existing._id;
  }

  return await ctx.db.insert("game_reviews", {
    gameId,
    summary: payload.summary,
    evaluations: payload.evaluations,
    keyMoments: payload.keyMoments,
    suggestions: payload.suggestions,
    moveAnnotations: payload.moveAnnotations,
    ...(payload.openingNameLichess !== undefined &&
    payload.openingNameLichess !== null
      ? { openingNameLichess: payload.openingNameLichess }
      : {}),
    createdAt: now,
  });
}

const save = ownedGameMutation({
  args: {
    summary: v.string(),
    evaluations: v.optional(v.array(v.number())),
    keyMoments: v.optional(v.array(v.string())),
    suggestions: v.optional(v.array(v.string())),
    moveAnnotations: v.optional(v.array(moveAnnotationValidator)),
    openingNameLichess: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.id("game_reviews"),
  handler: async (ctx, args) => {
    if (ctx.game.status !== "completed") {
      throw new Error("Only completed games can be analyzed");
    }

    const summaryTrimmed = args.summary.trim();
    if (summaryTrimmed.length === 0) {
      throw new Error("Summary is required");
    }
    if (summaryTrimmed.length > MAX_SUMMARY_LENGTH) {
      throw new Error(
        `Summary must be ${MAX_SUMMARY_LENGTH} characters or less`
      );
    }

    const evaluations = (args.evaluations ?? []).slice(0, MAX_EVALUATIONS);
    const keyMoments = (args.keyMoments ?? []).slice(0, MAX_KEY_MOMENTS);
    const suggestions = (args.suggestions ?? []).slice(0, MAX_SUGGESTIONS);
    const moveAnnotations = (args.moveAnnotations ?? []).slice(
      0,
      MAX_MOVE_ANNOTATIONS
    );

    let openingNameLichess: string | null | undefined = undefined;
    if (args.openingNameLichess === null) {
      openingNameLichess = null;
    } else if (args.openingNameLichess !== undefined) {
      const trimmed = args.openingNameLichess.trim();
      openingNameLichess = trimmed === "" ? null : trimmed;
    }

    return await saveReviewInternal(ctx, args.gameId, {
      summary: summaryTrimmed,
      evaluations,
      keyMoments,
      suggestions,
      moveAnnotations,
      openingNameLichess,
    });
  },
});

/**
 * Atomically claims the right to run LLM generation (cooldown + in-flight lock).
 * Called from `ai_game_summary` action before `generateGameSummary`.
 */
const claimAiSummaryGeneration = internalMutation({
  args: {
    gameId: v.id("games"),
    callerUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== args.callerUserId) {
      throw new Error("You do not have access to this game");
    }

    const existing = await ctx.db
      .query("game_reviews")
      .withIndex("by_gameId", (indexQuery) =>
        indexQuery.eq("gameId", args.gameId)
      )
      .unique();

    if (existing === null) {
      throw new Error("No review for this game; run analysis first");
    }

    const generatedAt = existing.aiSummaryMeta?.generatedAt;
    if (generatedAt !== undefined) {
      const elapsed = Date.now() - generatedAt;
      if (elapsed < AI_SUMMARY_COOLDOWN_MS) {
        throw new Error(
          "AI summary was generated recently. Try again in a few minutes."
        );
      }
    }

    const startedAt = existing.aiSummaryGenerationStartedAt;
    if (startedAt !== undefined) {
      const lockAge = Date.now() - startedAt;
      if (lockAge < AI_SUMMARY_GENERATION_LOCK_MS) {
        throw new Error(
          "A summary is already being generated. Please wait a moment."
        );
      }
    }

    await ctx.db.patch(existing._id, {
      aiSummaryGenerationStartedAt: Date.now(),
    });
    return null;
  },
});

/** Clears in-flight lock after a failed generation (action error before patch). */
const releaseAiSummaryGeneration = internalMutation({
  args: {
    gameId: v.id("games"),
    callerUserId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      return null;
    }
    if (game.userId !== args.callerUserId) {
      return null;
    }
    const existing = await ctx.db
      .query("game_reviews")
      .withIndex("by_gameId", (indexQuery) =>
        indexQuery.eq("gameId", args.gameId)
      )
      .unique();
    if (existing === null) {
      return null;
    }
    await ctx.db.patch(existing._id, {
      aiSummaryGenerationStartedAt: undefined,
    });
    return null;
  },
});

/**
 * Server-only: called from Convex actions after LLM generation. Do not expose to clients.
 */
const patchAiSummary = internalMutation({
  args: {
    gameId: v.id("games"),
    /** Must match the owning user; internal callers must pass the authenticated subject. */
    callerUserId: v.string(),
    aiSummary: v.string(),
    aiSummaryMeta: aiSummaryMetaValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== args.callerUserId) {
      throw new Error("You do not have access to this game");
    }

    const trimmed = args.aiSummary.trim();
    if (trimmed.length === 0) {
      throw new Error("aiSummary is required");
    }
    if (trimmed.length > MAX_AI_SUMMARY_LENGTH) {
      throw new Error(
        `AI summary must be ${String(MAX_AI_SUMMARY_LENGTH)} characters or less`
      );
    }

    const existing = await ctx.db
      .query("game_reviews")
      .withIndex("by_gameId", (indexQuery) =>
        indexQuery.eq("gameId", args.gameId)
      )
      .unique();

    if (existing === null) {
      throw new Error("No review for this game; run analysis first");
    }

    await ctx.db.patch(existing._id, {
      aiSummary: trimmed,
      aiSummaryMeta: args.aiSummaryMeta,
      aiSummaryGenerationStartedAt: undefined,
    });
    return null;
  },
});

export {
  claimAiSummaryGeneration,
  getByGameId,
  patchAiSummary,
  releaseAiSummaryGeneration,
  save,
};
