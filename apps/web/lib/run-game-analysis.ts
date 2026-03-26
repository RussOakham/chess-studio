"use client";

import { getSanForMove } from "@/lib/chess-notation";
import { sortMovesByNumber } from "@/lib/game-replay";
import {
  getBookOpeningLine,
  isBookContinuation,
  OPENING_MAX_PLY,
} from "@/lib/lichess/book-heuristic";
import { explorerMastersCacheKey } from "@/lib/lichess/fen-for-explorer-cache";
import type { ExplorerMastersResponse } from "@/lib/lichess/types";
import type {
  DifficultyLevel,
  MoveAnnotation,
  MoveAnnotationType,
  PositionEvaluation,
} from "@repo/chess";

/** Centipawn equivalent for mate (for drop calculation). */
const MATE_CP = 10000;

/** Eval loss thresholds (centipawns) for suboptimal moves (tunable). */
const BLUNDER_CP = 300;
const MISTAKE_CP = 100;
/** Inaccuracy band: [INACCURACY_CP, MISTAKE_CP). */
const INACCURACY_CP = 40;
/** Below this, treat eval swing as noise → still "good". */
const GOOD_FLOOR_CP = 25;

function evalToCp(ev: PositionEvaluation): number {
  if (ev.type === "cp") {
    return ev.value;
  }
  return ev.value > 0 ? MATE_CP : -MATE_CP;
}

/** Normalize UCI for comparison (e.g. "e7e8q" vs "e7e8q"). */
function normalizeUci(uci: string): string {
  return uci.toLowerCase().trim();
}

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
  difficulty: DifficultyLevel
) => Promise<{ from: string; to: string; promotion?: string; uci: string }>;

/** Map key: `explorerMastersCacheKey(fen)` → masters explorer JSON or null if unavailable. */
type GetExplorerBatch = (
  fens: string[]
) => Promise<Map<string, ExplorerMastersResponse | null>>;

function classifySuboptimalMove(drop: number): MoveAnnotationType | null {
  if (drop < GOOD_FLOOR_CP) {
    return null;
  }
  if (drop >= BLUNDER_CP) {
    return "blunder";
  }
  if (drop >= MISTAKE_CP) {
    return "mistake";
  }
  if (drop >= INACCURACY_CP) {
    return "inaccuracy";
  }
  return "good";
}

/**
 * Run Stockfish analysis over a completed game's moves.
 * Uses fixed "medium" depth for analysis. Calls onProgress(completed, total) each move.
 * Runs sequentially to avoid overloading the Stockfish worker.
 */
async function runGameAnalysisImpl(
  _game: GameForAnalysis,
  moves: AnalysisMove[],
  getEvaluation: GetEvaluation,
  getBestMove: GetBestMove,
  onProgress?: (completed: number, total: number) => void,
  getExplorerBatch?: GetExplorerBatch
): Promise<GameAnalysisResult> {
  const sorted = sortMovesByNumber(moves);
  const total = sorted.length;
  const evaluations: number[] = [];
  const moveAnnotations: MoveAnnotation[] = [];
  const keyMoments: string[] = [];
  const analysisDepth: DifficultyLevel = "medium";

  let blunderCount = 0;
  let mistakeCount = 0;
  let inaccuracyCount = 0;
  let bestCount = 0;

  let explorerMap = new Map<string, ExplorerMastersResponse | null>();
  let openingNameLichess: string | undefined = undefined;

  if (getExplorerBatch !== undefined && sorted.length > 0) {
    const openingSlice = sorted.slice(0, OPENING_MAX_PLY);
    const uniqueFens = [...new Set(openingSlice.map((move) => move.fenBefore))];
    try {
      explorerMap = await getExplorerBatch(uniqueFens);
    } catch {
      explorerMap = new Map();
    }
    for (const move of openingSlice) {
      const key = explorerMastersCacheKey(move.fenBefore);
      const row = explorerMap.get(key);
      if (row?.opening?.name) {
        openingNameLichess = row.opening.name;
      }
    }
  }

  for (let index = 0; index < sorted.length; index++) {
    const move = sorted[index];
    if (move !== undefined) {
      onProgress?.(index, total);

      const { fenBefore, fenAfter } = move;
      const turn = fenBefore.split(" ")[1] === "b" ? "black" : "white";

      /* Sequential calls so Stockfish's isCalculating guard isn't tripped. */
      const evalBefore = await getEvaluation(fenBefore);
      const bestMoveResult = await getBestMove(fenBefore, analysisDepth);
      const evalAfter = await getEvaluation(fenAfter);

      const cpBefore = evalToCp(evalBefore);
      const cpAfter = evalToCp(evalAfter);
      const drop = turn === "white" ? cpBefore - cpAfter : cpAfter - cpBefore;

      const playedIsBest =
        normalizeUci(move.moveUci) === normalizeUci(bestMoveResult.uci);

      let annotationType: MoveAnnotationType = "good";
      let bestMoveSan: string | undefined = undefined;

      if (playedIsBest) {
        annotationType = "best";
        bestCount += 1;
      } else {
        bestMoveSan =
          getSanForMove(
            fenBefore,
            bestMoveResult.from,
            bestMoveResult.to,
            bestMoveResult.promotion
          ) ?? undefined;

        const suboptimal = classifySuboptimalMove(drop);
        if (suboptimal === "blunder") {
          annotationType = "blunder";
          blunderCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a blunder${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
        } else if (suboptimal === "mistake") {
          annotationType = "mistake";
          mistakeCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a mistake${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
        } else if (suboptimal === "inaccuracy") {
          annotationType = "inaccuracy";
          inaccuracyCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was inaccurate${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
        } else {
          annotationType = "good";
        }
      }

      const includeBestSan =
        bestMoveSan &&
        (annotationType === "blunder" ||
          annotationType === "mistake" ||
          annotationType === "inaccuracy");

      let finalType: MoveAnnotationType = annotationType;
      let bookOpeningEco: string | undefined = undefined;
      let bookOpeningName: string | undefined = undefined;
      if (index < OPENING_MAX_PLY && getExplorerBatch !== undefined) {
        const ex = explorerMap.get(explorerMastersCacheKey(fenBefore)) ?? null;
        if (ex !== null) {
          const line = getBookOpeningLine(ex, move.moveUci);
          if (line !== undefined) {
            bookOpeningEco = line.eco.trim() || undefined;
            bookOpeningName = line.name.trim() || undefined;
          }
          if (
            annotationType === "good" &&
            isBookContinuation(ex, move.moveUci)
          ) {
            finalType = "book";
          }
        }
      }

      moveAnnotations.push({
        moveNumber: move.moveNumber,
        type: finalType,
        ...(includeBestSan
          ? {
              bestMoveSan,
              bestMoveUci: normalizeUci(bestMoveResult.uci),
            }
          : {}),
        ...(bookOpeningEco || bookOpeningName
          ? {
              ...(bookOpeningEco ? { bookOpeningEco } : {}),
              ...(bookOpeningName ? { bookOpeningName } : {}),
            }
          : {}),
      });
      evaluations.push(cpAfter);
    }
  }

  onProgress?.(total, total);

  const summary = buildSummary(
    total,
    blunderCount,
    mistakeCount,
    inaccuracyCount,
    bestCount
  );
  const suggestions = buildSuggestions(
    blunderCount,
    mistakeCount,
    inaccuracyCount
  );

  return {
    summary,
    evaluations,
    keyMoments,
    suggestions,
    moveAnnotations,
    openingNameLichess: openingNameLichess ?? null,
  };
}

function buildSummary(
  moveCount: number,
  blunders: number,
  mistakes: number,
  inaccuracies: number,
  best: number
): string {
  const parts: string[] = [];
  parts.push(`Game had ${moveCount} move${moveCount === 1 ? "" : "s"}.`);
  if (blunders > 0 || mistakes > 0 || inaccuracies > 0) {
    const items: string[] = [];
    if (blunders > 0) {
      items.push(`${blunders} blunder${blunders === 1 ? "" : "s"}`);
    }
    if (mistakes > 0) {
      items.push(`${mistakes} mistake${mistakes === 1 ? "" : "s"}`);
    }
    if (inaccuracies > 0) {
      items.push(
        `${inaccuracies} inaccurac${inaccuracies === 1 ? "y" : "ies"}`
      );
    }
    parts.push(`You had ${items.join(", ")}.`);
  }
  if (best > 0) {
    parts.push(`${best} of your moves matched the engine's best.`);
  }
  return parts.join(" ");
}

function buildSuggestions(
  blunders: number,
  mistakes: number,
  inaccuracies: number
): string[] {
  const list: string[] = [];
  if (blunders > 0) {
    list.push("Take more time on critical moves to avoid blunders.");
  }
  if (mistakes > 0) {
    list.push(
      "Review key positions: consider the engine's best move and why it's stronger."
    );
  }
  if (inaccuracies > 0) {
    list.push(
      "Watch for small inaccuracies—they add up; compare your move with the engine line in quiet positions."
    );
  }
  if (blunders + mistakes > 3) {
    list.push(
      "Try to reduce tactical errors by checking your moves before playing."
    );
  }
  if (list.length === 0) {
    list.push("Keep reviewing your games to spot small improvements.");
  }
  return list.slice(0, 4);
}

export { runGameAnalysisImpl as runGameAnalysis };
export type {
  AnalysisMove,
  GameAnalysisResult,
  GameForAnalysis,
  MoveAnnotation,
  MoveAnnotationType,
};
