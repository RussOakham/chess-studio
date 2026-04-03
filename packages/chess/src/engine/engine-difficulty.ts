/** Search-depth presets for new games (maps to UCI `go depth N`). */
export const ENGINE_DIFFICULTY_IDS = [
  "beginner",
  "casual",
  "club",
  "intermediate",
  "strong",
  "advanced",
  "expert",
  "maximum",
] as const;

export type EngineDifficultyId = (typeof ENGINE_DIFFICULTY_IDS)[number];

/** @deprecated Use {@link EngineDifficultyId} for new code. */
export type LegacyEngineDifficulty = "easy" | "medium" | "hard";

/**
 * Difficulty stored on a game document: eight presets or legacy `easy` / `medium` / `hard`.
 */
export type GameDifficulty = EngineDifficultyId | LegacyEngineDifficulty;

/** @deprecated Alias for {@link GameDifficulty}. */
export type DifficultyLevel = GameDifficulty;

/**
 * Engine depth configuration based on difficulty (non-linear spacing).
 */
export const DIFFICULTY_DEPTH: Record<EngineDifficultyId, number> = {
  beginner: 8,
  casual: 10,
  club: 12,
  intermediate: 15,
  strong: 18,
  advanced: 22,
  expert: 26,
  maximum: 30,
};

const LEGACY_DEPTH: Record<LegacyEngineDifficulty, number> = {
  easy: 12,
  medium: 18,
  hard: 22,
};

/**
 * Get engine depth for a difficulty level
 */
export function getEngineDepth(difficulty: GameDifficulty): number {
  if (
    difficulty === "easy" ||
    difficulty === "medium" ||
    difficulty === "hard"
  ) {
    return LEGACY_DEPTH[difficulty];
  }
  return DIFFICULTY_DEPTH[difficulty];
}
