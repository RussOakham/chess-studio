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
    .index("by_updatedAt", ["updatedAt"]),

  moves: defineTable({
    gameId: v.id("games"),
    moveNumber: v.number(),
    moveSan: v.string(),
    moveUci: v.string(),
    fenBefore: v.string(),
    fenAfter: v.string(),
    evaluation: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),

  game_reviews: defineTable({
    gameId: v.id("games"),
    summary: v.string(),
    keyMoments: v.optional(v.array(v.string())),
    suggestions: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_gameId", ["gameId"]),
});
