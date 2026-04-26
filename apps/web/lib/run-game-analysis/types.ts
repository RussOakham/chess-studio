import type { ExplorerMastersResponse } from "@/lib/lichess/types";
import type {
  GameDifficulty,
  MoveAnnotation,
  PositionEvaluation,
} from "@repo/chess";

interface GameAnalysisResult {
  summary: string;
  /**
   * Centipawn-equivalent eval after each half-move (position after the move), in the same
   * order as `moveAnnotations` — i.e. `sortMovesByNumber(moves)` order, not the raw `moves` array.
   */
  evaluations: number[];
  keyMoments: string[];
  suggestions: string[];
  moveAnnotations: MoveAnnotation[];
  /** Lichess Opening Explorer name when available (deepest in opening window). */
  openingNameLichess?: string | null;
}

interface AnalysisMove {
  moveNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  moveUci: string;
}

interface GameForAnalysis {
  status: string;
  color: "white" | "black" | "random";
}

type GetEvaluation = (fen: string) => Promise<PositionEvaluation>;

type GetBestMove = (
  fen: string,
  difficulty: GameDifficulty
) => Promise<{ from: string; to: string; promotion?: string; uci: string }>;

/** Map key: `explorerMastersCacheKey(fen)` → masters explorer JSON or null if unavailable. */
type GetExplorerBatch = (
  fens: string[]
) => Promise<Map<string, ExplorerMastersResponse | null>>;

export {
  type AnalysisMove,
  type GameAnalysisResult,
  type GameForAnalysis,
  type GetBestMove,
  type GetEvaluation,
  type GetExplorerBatch,
};
