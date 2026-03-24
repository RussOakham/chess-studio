import type {
  BoardArrow,
  CustomSquareStyles,
} from "@/components/chess/chessboard";
import {
  REVIEW_ENGINE_BEST_ARROW,
  playedMoveArrowColor,
} from "@/lib/review-overlay-colors";
import type { MoveAnnotationType } from "@repo/chess";
import { Chess } from "chess.js";

interface SquarePair {
  from: string;
  to: string;
}

/**
 * Parse SAN in a position. Returns null if illegal or ambiguous.
 */
function parseSanToFromTo(fenBefore: string, san: string): SquarePair | null {
  const trimmed = san.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const chess = new Chess();
    chess.load(fenBefore);
    const move = chess.move(trimmed);
    if (move === null) {
      return null;
    }
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}

/**
 * Parse UCI (4–5 chars: from, to, optional promotion).
 */
function uciToFromTo(uci: string): SquarePair | null {
  const normalized = uci.trim().toLowerCase();
  if (normalized.length !== 4 && normalized.length !== 5) {
    return null;
  }
  const from = normalized.slice(0, 2);
  const to = normalized.slice(2, 4);
  if (!/^[a-h][1-8]$/.test(from) || !/^[a-h][1-8]$/.test(to)) {
    return null;
  }
  const promotion = normalized.length === 5 ? normalized[4] : undefined;
  if (
    promotion !== undefined &&
    promotion !== "q" &&
    promotion !== "r" &&
    promotion !== "b" &&
    promotion !== "n"
  ) {
    return null;
  }
  return { from, to };
}

interface BuildReviewBoardArrowsOptions {
  fenBefore: string;
  playedMoveUci: string;
  annotation: {
    type: MoveAnnotationType;
    bestMoveSan?: string;
    bestMoveUci?: string;
  };
}

interface BuildReviewBoardArrowsResult {
  arrows: BoardArrow[];
  squareStyles: CustomSquareStyles | undefined;
  error: string | null;
}

function buildOverlaySquareStyles(
  played: SquarePair,
  best: SquarePair
): CustomSquareStyles {
  const playedBg = "rgba(148, 163, 184, 0.2)";
  const bestBg = "rgba(34, 197, 94, 0.18)";
  const styles: CustomSquareStyles = {};
  for (const sq of [played.from, played.to]) {
    styles[sq] = { backgroundColor: playedBg };
  }
  for (const sq of [best.from, best.to]) {
    styles[sq] = { backgroundColor: bestBg };
  }
  return styles;
}

/**
 * Draws played move (muted) then engine best (green) so the best line sits on top.
 */
function buildReviewBoardArrows(
  options: BuildReviewBoardArrowsOptions
): BuildReviewBoardArrowsResult {
  const { fenBefore, playedMoveUci, annotation } = options;
  const played = uciToFromTo(playedMoveUci);
  if (played === null) {
    return {
      arrows: [],
      squareStyles: undefined,
      error: "Could not draw engine line for this move.",
    };
  }

  let best: SquarePair | null = null;
  if (
    annotation.bestMoveUci !== undefined &&
    annotation.bestMoveUci.length > 0
  ) {
    best = uciToFromTo(annotation.bestMoveUci);
  }
  if (best === null && annotation.bestMoveSan !== undefined) {
    best = parseSanToFromTo(fenBefore, annotation.bestMoveSan);
  }
  if (best === null) {
    return {
      arrows: [],
      squareStyles: undefined,
      error: "Could not draw engine line for this move.",
    };
  }

  const playedColor = playedMoveArrowColor(annotation.type);
  const arrows: BoardArrow[] = [
    [played.from, played.to, playedColor],
    [best.from, best.to, REVIEW_ENGINE_BEST_ARROW],
  ];
  return {
    arrows,
    squareStyles: buildOverlaySquareStyles(played, best),
    error: null,
  };
}

export type { BuildReviewBoardArrowsOptions, BuildReviewBoardArrowsResult };
export { buildReviewBoardArrows, parseSanToFromTo, uciToFromTo };
