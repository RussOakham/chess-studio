"use client";

import { getSanForMove } from "@/lib/chess-notation";
import { sortMovesByNumber } from "@/lib/game-replay";
import type { DifficultyLevel, PositionEvaluation } from "@repo/chess";

/** Centipawn equivalent for mate (for drop calculation). */
const MATE_CP = 10000;

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

type MoveAnnotationType =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder";

interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
  evalBefore?: number;
  evalAfter?: number;
  isMate?: boolean;
  mateIn?: number;
}

interface MoveEvaluation {
  moveNumber: number;
  evalAfter: number;
  isMate?: boolean;
  mateIn?: number;
}

const BLUNDER_CP = 200;
const MISTAKE_CP = 100;
const INACCURACY_CP = 50;
const EXCELLENT_CP = 10;

interface GameAnalysisResult {
  summary: string;
  keyMoments: string[];
  suggestions: string[];
  moveAnnotations: MoveAnnotation[];
  moveEvaluations: MoveEvaluation[];
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

/**
 * Classify a move based on centipawn drop and whether it matches the best move.
 * Returns: brilliant, great, best, excellent, good, inaccuracy, mistake, or blunder.
 */
function classifyMove(
  playedIsBest: boolean,
  cpDrop: number,
  evalBeforeCp: number,
  evalAfterCp: number,
  isWinning: boolean
): MoveAnnotationType {
  if (playedIsBest) {
    if (isWinning && Math.abs(evalBeforeCp) < 100 && evalAfterCp > 150) {
      return "brilliant";
    }
    if (evalAfterCp > evalBeforeCp + 50) {
      return "great";
    }
    return "best";
  }

  if (cpDrop >= BLUNDER_CP) {
    return "blunder";
  }
  if (cpDrop >= MISTAKE_CP) {
    return "mistake";
  }
  if (cpDrop >= INACCURACY_CP) {
    return "inaccuracy";
  }
  if (cpDrop <= EXCELLENT_CP) {
    return "excellent";
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
  onProgress?: (completed: number, total: number) => void
): Promise<GameAnalysisResult> {
  const sorted = sortMovesByNumber(moves);
  const total = sorted.length;
  const moveAnnotations: MoveAnnotation[] = [];
  const moveEvaluations: MoveEvaluation[] = [];
  const keyMoments: string[] = [];
  const analysisDepth: DifficultyLevel = "medium";

  let blunderCount = 0;
  let mistakeCount = 0;
  let inaccuracyCount = 0;
  let bestCount = 0;
  let brilliantCount = 0;
  let greatCount = 0;

  for (let index = 0; index < sorted.length; index++) {
    const move = sorted[index];
    if (move !== undefined) {
      onProgress?.(index, total);

      const { fenBefore, fenAfter } = move;
      const turn = fenBefore.split(" ")[1] === "b" ? "black" : "white";

      /* Sequential calls so Stockfish's isCalculating guard isn't tripped. */
      /* eslint-disable no-await-in-loop -- intentional: sequential per-move analysis */
      const evalBefore = await getEvaluation(fenBefore);
      const bestMoveResult = await getBestMove(fenBefore, analysisDepth);
      const evalAfter = await getEvaluation(fenAfter);
      /* eslint-enable no-await-in-loop */

      const cpBefore = evalToCp(evalBefore);
      const cpAfter = evalToCp(evalAfter);
      const perspectiveCpBefore = turn === "white" ? cpBefore : -cpBefore;
      const perspectiveCpAfter = turn === "white" ? cpAfter : -cpAfter;
      const drop = perspectiveCpBefore - perspectiveCpAfter;

      const playedIsBest =
        normalizeUci(move.moveUci) === normalizeUci(bestMoveResult.uci);
      const isWinning = perspectiveCpAfter > perspectiveCpBefore;

      const annotationType = classifyMove(
        playedIsBest,
        drop,
        perspectiveCpBefore,
        perspectiveCpAfter,
        isWinning
      );

      let bestMoveSan: string | undefined = undefined;
      if (!playedIsBest) {
        bestMoveSan =
          getSanForMove(
            fenBefore,
            bestMoveResult.from,
            bestMoveResult.to,
            bestMoveResult.promotion
          ) ?? undefined;
      }

      switch (annotationType) {
        case "brilliant": {
          brilliantCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was brilliant!`
          );
          break;
        }
        case "great": {
          greatCount += 1;
          break;
        }
        case "best": {
          bestCount += 1;
          break;
        }
        case "blunder": {
          blunderCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a blunder${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
          break;
        }
        case "mistake": {
          mistakeCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a mistake${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
          break;
        }
        case "inaccuracy": {
          inaccuracyCount += 1;
          break;
        }
        default: {
          break;
        }
      }

      moveAnnotations.push({
        moveNumber: move.moveNumber,
        type: annotationType,
        evalBefore: cpBefore,
        evalAfter: cpAfter,
        isMate: evalAfter.type === "mate" ? true : undefined,
        mateIn:
          evalAfter.type === "mate" ? Math.abs(evalAfter.value) : undefined,
        ...(bestMoveSan &&
        (annotationType === "blunder" ||
          annotationType === "mistake" ||
          annotationType === "inaccuracy")
          ? { bestMoveSan }
          : {}),
      });

      moveEvaluations.push({
        moveNumber: move.moveNumber,
        evalAfter: cpAfter,
        isMate: evalAfter.type === "mate" ? true : undefined,
        mateIn:
          evalAfter.type === "mate" ? Math.abs(evalAfter.value) : undefined,
      });
    }
  }

  onProgress?.(total, total);

  const summary = buildSummary(
    total,
    blunderCount,
    mistakeCount,
    inaccuracyCount,
    bestCount,
    brilliantCount,
    greatCount
  );
  const suggestions = buildSuggestions(
    blunderCount,
    mistakeCount,
    inaccuracyCount
  );

  return {
    summary,
    keyMoments,
    suggestions,
    moveAnnotations,
    moveEvaluations,
  };
}

function buildSummary(
  moveCount: number,
  blunders: number,
  mistakes: number,
  inaccuracies: number,
  best: number,
  brilliant: number,
  great: number
): string {
  const parts: string[] = [];
  parts.push(`Game had ${moveCount} move${moveCount === 1 ? "" : "s"}.`);

  if (brilliant > 0 || great > 0) {
    const highlights: string[] = [];
    if (brilliant > 0) {
      highlights.push(
        `${brilliant} brilliant move${brilliant === 1 ? "" : "s"}`
      );
    }
    if (great > 0) {
      highlights.push(`${great} great move${great === 1 ? "" : "s"}`);
    }
    parts.push(`You played ${highlights.join(" and ")}!`);
  }

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
  if (inaccuracies > 2) {
    list.push("Focus on accuracy - small improvements add up over time.");
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
