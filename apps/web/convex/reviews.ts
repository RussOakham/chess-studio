import { v } from "convex/values";

/**
 * Convex queries and mutations for game reviews (post-game analysis).
 * Auth: caller must own the game. Only completed games can have reviews saved.
 */
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const MAX_KEY_MOMENTS = 20;
const MAX_SUGGESTIONS = 10;
const MAX_MOVE_ANNOTATIONS = 500;
const MAX_SUMMARY_LENGTH = 10_000;

async function getUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/** Throws if not authenticated or game not found or not owned by caller. Returns the game doc. */
async function requireGameAccess(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<"games">
): Promise<Doc<"games">> {
  const userId = await getUserId(ctx);
  const game = await ctx.db.get(gameId);
  if (game === null) {
    throw new Error("Game not found");
  }
  if (game.userId !== userId) {
    throw new Error("You do not have access to this game");
  }
  return game;
}

const moveAnnotationValidator = v.object({
  moveNumber: v.number(),
  type: v.union(
    v.literal("brilliant"),
    v.literal("great"),
    v.literal("best"),
    v.literal("excellent"),
    v.literal("good"),
    v.literal("book"),
    v.literal("inaccuracy"),
    v.literal("mistake"),
    v.literal("miss"),
    v.literal("blunder")
  ),
  bestMoveSan: v.optional(v.string()),
  evalBefore: v.optional(v.number()),
  evalAfter: v.optional(v.number()),
  isMate: v.optional(v.boolean()),
  mateIn: v.optional(v.number()),
});

const moveEvaluationValidator = v.object({
  moveNumber: v.number(),
  evalAfter: v.number(),
  isMate: v.optional(v.boolean()),
  mateIn: v.optional(v.number()),
});

const getByGameId = query({
  args: { gameId: v.id("games") },
  returns: v.union(
    v.object({
      _id: v.id("game_reviews"),
      _creationTime: v.number(),
      gameId: v.id("games"),
      summary: v.string(),
      keyMoments: v.optional(v.array(v.string())),
      suggestions: v.optional(v.array(v.string())),
      moveAnnotations: v.optional(v.array(moveAnnotationValidator)),
      moveEvaluations: v.optional(v.array(moveEvaluationValidator)),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireGameAccess(ctx, args.gameId);
    const review = await ctx.db
      .query("game_reviews")
      .withIndex("by_gameId", (indexQuery) =>
        indexQuery.eq("gameId", args.gameId)
      )
      .unique();
    return review;
  },
});

type MoveAnnotationType =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder";

interface MoveAnnotationPayload {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
  evalBefore?: number;
  evalAfter?: number;
  isMate?: boolean;
  mateIn?: number;
}

interface MoveEvaluationPayload {
  moveNumber: number;
  evalAfter: number;
  isMate?: boolean;
  mateIn?: number;
}

/** Internal: upsert game review after auth and validation. */
async function saveReviewInternal(
  ctx: MutationCtx,
  gameId: Id<"games">,
  payload: {
    summary: string;
    keyMoments: string[];
    suggestions: string[];
    moveAnnotations: MoveAnnotationPayload[];
    moveEvaluations?: MoveEvaluationPayload[];
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
      keyMoments: payload.keyMoments,
      suggestions: payload.suggestions,
      moveAnnotations: payload.moveAnnotations,
      moveEvaluations: payload.moveEvaluations,
    });
    return existing._id;
  }

  return await ctx.db.insert("game_reviews", {
    gameId,
    summary: payload.summary,
    keyMoments: payload.keyMoments,
    suggestions: payload.suggestions,
    moveAnnotations: payload.moveAnnotations,
    moveEvaluations: payload.moveEvaluations,
    createdAt: now,
  });
}

const save = mutation({
  args: {
    gameId: v.id("games"),
    summary: v.string(),
    keyMoments: v.optional(v.array(v.string())),
    suggestions: v.optional(v.array(v.string())),
    moveAnnotations: v.optional(v.array(moveAnnotationValidator)),
    moveEvaluations: v.optional(v.array(moveEvaluationValidator)),
  },
  returns: v.id("game_reviews"),
  handler: async (ctx, args) => {
    const game = await requireGameAccess(ctx, args.gameId);
    if (game.status !== "completed") {
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

    const keyMoments = (args.keyMoments ?? []).slice(0, MAX_KEY_MOMENTS);
    const suggestions = (args.suggestions ?? []).slice(0, MAX_SUGGESTIONS);
    const moveAnnotations = (args.moveAnnotations ?? []).slice(
      0,
      MAX_MOVE_ANNOTATIONS
    );
    const moveEvaluations = (args.moveEvaluations ?? []).slice(
      0,
      MAX_MOVE_ANNOTATIONS
    );

    return await saveReviewInternal(ctx, args.gameId, {
      summary: summaryTrimmed,
      keyMoments,
      suggestions,
      moveAnnotations,
      moveEvaluations,
    });
  },
});

export { getByGameId, save };
