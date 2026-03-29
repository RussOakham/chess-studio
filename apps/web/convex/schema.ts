import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { gameDifficultyValidator } from "./gameDifficulty";

/**
 * Convex schema for chess-studio games, moves, and game reviews.
 * Better Auth persists via `@convex-dev/better-auth` (not Postgres). `difficulty` includes
 * legacy `easy` / `medium` / `hard` for existing documents; new games use eight presets.
 */

export default defineSchema({
  games: defineTable({
    userId: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    result: v.optional(
      v.union(
        v.literal("white_wins"),
        v.literal("black_wins"),
        v.literal("draw")
      )
    ),
    drawOfferedBy: v.optional(v.union(v.literal("white"), v.literal("black"))),
    difficulty: gameDifficultyValidator,
    color: v.union(v.literal("white"), v.literal("black"), v.literal("random")),
    fen: v.string(),
    pgn: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId_updatedAt", ["userId", "updatedAt"]),

  moves: defineTable({
    gameId: v.id("games"),
    moveNumber: v.number(),
    moveSan: v.string(),
    moveUci: v.string(),
    fenBefore: v.string(),
    fenAfter: v.string(),
    evaluation: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_gameId_moveNumber", ["gameId", "moveNumber"]),

  /** Post-game analysis: summary, key moments, suggestions, per-move annotations. */
  game_reviews: defineTable({
    gameId: v.id("games"),
    summary: v.string(),
    /** Centipawn (or similar) eval per position after each half-move, for replay UI. */
    evaluations: v.optional(v.array(v.number())),
    keyMoments: v.optional(v.array(v.string())),
    suggestions: v.optional(v.array(v.string())),
    /** Lichess Opening Explorer name when available (deepest named node in opening window). */
    openingNameLichess: v.optional(v.string()),
    moveAnnotations: v.optional(
      v.array(
        v.object({
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
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),

  /** Server-side cache for Lichess Opening Explorer JSON (TTL enforced in action). */
  lichess_explorer_cache: defineTable({
    cacheKey: v.string(),
    /** Explorer JSON body, or `null` when upstream returned no position (e.g. 404). */
    payloadJson: v.union(v.string(), v.null()),
    fetchedAt: v.number(),
  }).index("by_cacheKey", ["cacheKey"]),
});
