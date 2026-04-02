"use node";

import { v } from "convex/values";

import { getAiSummaryModelId } from "../lib/ai/config";
import { GAME_SUMMARY_PROMPT_VERSION } from "../lib/ai/prompts/game-summary";
import { generateGameSummary } from "../lib/ai/providers/game-summary";
import { buildGameSummaryInput } from "../lib/ai/schemas/game-summary-input";
import { api, internal } from "./_generated/api";
import { authedAction } from "./lib/authed_functions";

const generate = authedAction({
  args: {
    gameId: v.id("games"),
    regenerate: v.optional(v.boolean()),
  },
  returns: v.union(
    v.object({
      status: v.literal("generated"),
      model: v.string(),
    }),
    v.object({
      status: v.literal("unchanged"),
    })
  ),
  handler: async (ctx, args) => {
    const game = await ctx.runQuery(api.games.getById, {
      gameId: args.gameId,
    });

    const review = await ctx.runQuery(api.reviews.getByGameId, {
      gameId: args.gameId,
    });
    if (review === null) {
      throw new Error("Run analysis first before generating an AI summary.");
    }

    const regenerate = args.regenerate ?? false;
    const existingSummary = review.aiSummary?.trim();
    if (
      existingSummary !== undefined &&
      existingSummary.length > 0 &&
      !regenerate
    ) {
      return { status: "unchanged" as const };
    }

    await ctx.runMutation(internal.reviews.claimAiSummaryGeneration, {
      gameId: args.gameId,
      callerUserId: ctx.userId,
    });

    const dto = buildGameSummaryInput({
      review: {
        summary: review.summary,
        evaluations: review.evaluations,
        keyMoments: review.keyMoments,
        suggestions: review.suggestions,
        openingNameLichess: review.openingNameLichess,
        moveAnnotations: review.moveAnnotations,
      },
      game: {
        result: game.result,
        difficulty: game.difficulty,
        color: game.color,
        pgn: game.pgn,
        fen: game.fen,
      },
    });

    const modelId = getAiSummaryModelId();

    try {
      const { text } = await generateGameSummary(dto);
      await ctx.runMutation(internal.reviews.patchAiSummary, {
        gameId: args.gameId,
        callerUserId: ctx.userId,
        aiSummary: text,
        aiSummaryMeta: {
          model: modelId,
          generatedAt: Date.now(),
          promptVersion: GAME_SUMMARY_PROMPT_VERSION,
        },
      });
    } catch (error) {
      await ctx.runMutation(internal.reviews.releaseAiSummaryGeneration, {
        gameId: args.gameId,
        callerUserId: ctx.userId,
      });
      throw error;
    }

    return { status: "generated" as const, model: modelId };
  },
});

export { generate };
