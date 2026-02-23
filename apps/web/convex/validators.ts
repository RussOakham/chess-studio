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

/**
 * Validator for Better Auth user document (matches @convex-dev/better-auth component user table).
 * Uses v.string() for _id because the user table lives in the component schema.
 */
const authUserValidator = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  name: v.string(),
  email: v.string(),
  emailVerified: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
  image: v.optional(v.union(v.string(), v.null())),
  userId: v.optional(v.union(v.string(), v.null())),
  twoFactorEnabled: v.optional(v.union(v.boolean(), v.null())),
  isAnonymous: v.optional(v.union(v.boolean(), v.null())),
  username: v.optional(v.union(v.string(), v.null())),
  displayUsername: v.optional(v.union(v.string(), v.null())),
  phoneNumber: v.optional(v.union(v.string(), v.null())),
  phoneNumberVerified: v.optional(v.union(v.boolean(), v.null())),
});

export {
  authUserValidator,
  gameValidator,
  makeMoveReturnMoveValidator,
  moveValidator,
};
