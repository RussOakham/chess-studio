import { v } from "convex/values";

/** Validator for a game document (matches games table). */
const gameValidator = v.object({
  _id: v.id("games"),
  userId: v.string(),
  status: v.union(
    v.literal("waiting"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("abandoned")
  ),
  result: v.optional(
    v.union(v.literal("white_wins"), v.literal("black_wins"), v.literal("draw"))
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
});

/** Validator for a move document (matches moves table). */
const moveValidator = v.object({
  _id: v.id("moves"),
  gameId: v.id("games"),
  moveNumber: v.number(),
  moveSan: v.string(),
  moveUci: v.string(),
  fenBefore: v.string(),
  fenAfter: v.string(),
  evaluation: v.optional(v.number()),
  createdAt: v.number(),
});

/** Validator for makeMove return move shape. */
const makeMoveReturnMoveValidator = v.object({
  from: v.string(),
  to: v.string(),
  san: v.string(),
  uci: v.string(),
});

export { gameValidator, makeMoveReturnMoveValidator, moveValidator };
