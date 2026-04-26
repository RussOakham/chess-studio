/**
 * Stockfish instance type (Web Worker-like interface)
 * Uses native MessageEvent from DOM types
 */
interface StockfishInstance {
  postMessage: (message: string) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent<string>) => void
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (event: MessageEvent<string>) => void
  ) => void;
  terminate: () => void;
}

/** Evaluation in centipawns (from White's perspective). */
interface PositionEvaluationCp {
  type: "cp";
  value: number;
}

/** Mate distance (positive = White mates in N; negative = Black mates in |N|). */
interface PositionEvaluationMate {
  type: "mate";
  value: number;
}

type PositionEvaluation = PositionEvaluationCp | PositionEvaluationMate;

/** One principal variation from a MultiPV search (1-based multipv index). */
interface EngineLine {
  multipv: number;
  evaluation: PositionEvaluation;
  movesUci: string[];
}

/** Options for {@link getTopEngineLines}. */
interface GetTopEngineLinesOptions {
  depth: number;
  /** Number of lines (UCI MultiPV), default 3. */
  multipv?: number;
}

export type { PositionEvaluation };
export {
  type EngineLine,
  type GetTopEngineLinesOptions,
  type PositionEvaluationCp,
  type PositionEvaluationMate,
  type StockfishInstance,
};
