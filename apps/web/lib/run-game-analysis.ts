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

type MoveAnnotationType = "blunder" | "mistake" | "good" | "best";

interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
}

const BLUNDER_CP = 300;
const MISTAKE_CP = 100;

interface GameAnalysisResult {
  summary: string;
  keyMoments: string[];
  suggestions: string[];
  moveAnnotations: MoveAnnotation[];
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
  const keyMoments: string[] = [];
  const analysisDepth: DifficultyLevel = "medium";

  let blunderCount = 0;
  let mistakeCount = 0;
  let bestCount = 0;

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

        if (drop >= BLUNDER_CP) {
          annotationType = "blunder";
          blunderCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a blunder${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
        } else if (drop >= MISTAKE_CP) {
          annotationType = "mistake";
          mistakeCount += 1;
          keyMoments.push(
            `Move ${move.moveNumber}: ${move.moveSan} was a mistake${bestMoveSan ? `; best was ${bestMoveSan}` : ""}.`
          );
        }
      }

      moveAnnotations.push({
        moveNumber: move.moveNumber,
        type: annotationType,
        ...(bestMoveSan &&
        (annotationType === "blunder" || annotationType === "mistake")
          ? { bestMoveSan }
          : {}),
      });
    }
  }

  onProgress?.(total, total);

  const summary = buildSummary(total, blunderCount, mistakeCount, bestCount);
  const suggestions = buildSuggestions(blunderCount, mistakeCount);

  return {
    summary,
    keyMoments,
    suggestions,
    moveAnnotations,
  };
}

function buildSummary(
  moveCount: number,
  blunders: number,
  mistakes: number,
  best: number
): string {
  const parts: string[] = [];
  parts.push(`Game had ${moveCount} move${moveCount === 1 ? "" : "s"}.`);
  if (blunders > 0 || mistakes > 0) {
    const items: string[] = [];
    if (blunders > 0) {
      items.push(`${blunders} blunder${blunders === 1 ? "" : "s"}`);
    }
    if (mistakes > 0) {
      items.push(`${mistakes} mistake${mistakes === 1 ? "" : "s"}`);
    }
    parts.push(`You had ${items.join(" and ")}.`);
  }
  if (best > 0) {
    parts.push(`${best} of your moves matched the engine's best.`);
  }
  return parts.join(" ");
}

function buildSuggestions(blunders: number, mistakes: number): string[] {
  const list: string[] = [];
  if (blunders > 0) {
    list.push("Take more time on critical moves to avoid blunders.");
  }
  if (mistakes > 0) {
    list.push(
      "Review key positions: consider the engine's best move and why it's stronger."
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
