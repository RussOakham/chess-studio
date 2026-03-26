import { v } from "convex/values";

/**
 * Convex queries and mutations for game reviews (post-game analysis).
 * Auth: caller must own the game (ownedGame* wrappers). Only completed games can have reviews saved.
 */
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ownedGameMutation, ownedGameQuery } from "./lib/authed_functions";

const MAX_KEY_MOMENTS = 20;
const MAX_SUGGESTIONS = 10;
const MAX_MOVE_ANNOTATIONS = 500;
const MAX_EVALUATIONS = 500;
const MAX_SUMMARY_LENGTH = 10_000;

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

export { getByGameId, save };
