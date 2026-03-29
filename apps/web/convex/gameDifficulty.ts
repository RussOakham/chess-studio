import { v } from "convex/values";

/** Stored on games: current presets plus legacy values from older clients. */
const gameDifficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("casual"),
  v.literal("club"),
  v.literal("intermediate"),
  v.literal("strong"),
  v.literal("advanced"),
  v.literal("expert"),
  v.literal("maximum"),
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard")
);

/** Args for `games.create` — new games only use the eight presets. */
const createGameDifficultyValidator = v.union(
  v.literal("beginner"),
  v.literal("casual"),
  v.literal("club"),
  v.literal("intermediate"),
  v.literal("strong"),
  v.literal("advanced"),
  v.literal("expert"),
  v.literal("maximum")
);

export { createGameDifficultyValidator, gameDifficultyValidator };
