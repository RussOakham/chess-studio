import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex schema for chess-studio games, moves, and game reviews.
 * Mirrors the Drizzle/Postgres semantics (see packages/db); no historic data migration.
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
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    color: v.union(v.literal("white"), v.literal("black"), v.literal("random")),
    fen: v.string(),
    pgn: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_updatedAt", ["userId", "updatedAt"]),

  moves: defineTable({
    gameId: v.id("games"),
    moveNumber: v.number(),
    moveSan: v.string(),
    moveUci: v.string(),
    fenBefore: v.string(),
    fenAfter: v.string(),
    evaluation: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_gameId", ["gameId"])
    .index("by_gameId_moveNumber", ["gameId", "moveNumber"]),

  /** Post-game analysis: summary, key moments, suggestions, per-move annotations, evaluations. */
  game_reviews: defineTable({
    gameId: v.id("games"),
    summary: v.string(),
    keyMoments: v.optional(v.array(v.string())),
    suggestions: v.optional(v.array(v.string())),
    moveAnnotations: v.optional(
      v.array(
        v.object({
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
        })
      )
    ),
    moveEvaluations: v.optional(
      v.array(
        v.object({
          moveNumber: v.number(),
          evalAfter: v.number(),
          isMate: v.optional(v.boolean()),
          mateIn: v.optional(v.number()),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),
});
