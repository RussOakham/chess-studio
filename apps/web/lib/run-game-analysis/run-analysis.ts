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
  GameDifficulty,
  MoveAnnotation,
  MoveAnnotationType,
} from "@repo/chess";

import {
  classifySuboptimalMove,
  evalToCp,
  normalizeUci,
} from "./classification";
import { buildSuggestions, buildSummary } from "./summary-text";
import type {
  AnalysisMove,
  GameAnalysisResult,
  GameForAnalysis,
  GetBestMove,
  GetEvaluation,
  GetExplorerBatch,
} from "./types";

/**
 * Run Stockfish analysis over a completed game's moves.
 * Uses fixed "strong" depth for analysis. Calls onProgress(completed, total) each move.
 * Runs sequentially to avoid overloading the Stockfish worker.
 */
export async function runGameAnalysis(
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
  const analysisDepth: GameDifficulty = "strong";

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
      // eslint-disable-next-line no-await-in-loop -- Stockfish worker is stateful; keep this sequential
      const evalBefore = await getEvaluation(fenBefore);
      // eslint-disable-next-line no-await-in-loop -- Stockfish worker is stateful; keep this sequential
      const bestMoveResult = await getBestMove(fenBefore, analysisDepth);
      // eslint-disable-next-line no-await-in-loop -- Stockfish worker is stateful; keep this sequential
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
