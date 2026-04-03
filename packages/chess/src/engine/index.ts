// Stockfish engine utilities for chess analysis — public API barrel.

export {
  type DifficultyLevel,
  type EngineDifficultyId,
  type GameDifficulty,
  type LegacyEngineDifficulty,
  ENGINE_DIFFICULTY_IDS,
  DIFFICULTY_DEPTH,
  getEngineDepth,
} from "./engine-difficulty";

export {
  type EngineLine,
  type GetTopEngineLinesOptions,
  type PositionEvaluation,
  type PositionEvaluationCp,
  type PositionEvaluationMate,
  type StockfishInstance,
} from "./engine-types";

export {
  DEFAULT_ENGINE_LINES_MULTIPV,
  ENGINE_LINES_DEFAULT_DEPTH,
  getTopEngineLines,
} from "./top-engine-lines";

export { calculateBestMove } from "./best-move";
export { getPositionEvaluation } from "./position-evaluation";
export { parseMultipvInfoLine, sendUciStop } from "./uci";
