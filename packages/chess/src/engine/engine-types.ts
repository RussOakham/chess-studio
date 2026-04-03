/**
 * Stockfish instance type (Web Worker-like interface)
 * Uses native MessageEvent from DOM types
 */
export interface StockfishInstance {
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
export interface PositionEvaluationCp {
  type: "cp";
  value: number;
}

/** Mate distance (positive = White mates in N; negative = Black mates in |N|). */
export interface PositionEvaluationMate {
  type: "mate";
  value: number;
}

export type PositionEvaluation = PositionEvaluationCp | PositionEvaluationMate;

/** One principal variation from a MultiPV search (1-based multipv index). */
export interface EngineLine {
  multipv: number;
  evaluation: PositionEvaluation;
  movesUci: string[];
}

/** Options for {@link getTopEngineLines}. */
export interface GetTopEngineLinesOptions {
  depth: number;
  /** Number of lines (UCI MultiPV), default 3. */
  multipv?: number;
}
