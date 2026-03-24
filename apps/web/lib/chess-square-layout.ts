/**
 * Map algebraic squares to layout on a square board (react-chessboard coordinates).
 * White at bottom: a1 bottom-left, rank 1 bottom, rank 8 top.
 * Black at bottom: board rotated 180° in screen space.
 */

interface SquareIndices {
  file: number;
  rankIndex: number;
}

/**
 * Parse "e4" → file 0–7 (a–h), rankIndex 0–7 (rank 1–8 from White's bottom).
 */
function parseSquare(square: string): SquareIndices | null {
  const trimmed = square.trim().toLowerCase();
  if (!/^[a-h][1-8]$/.test(trimmed)) {
    return null;
  }
  const fileChar = trimmed[0];
  const rankChar = trimmed[1];
  if (fileChar === undefined || rankChar === undefined) {
    return null;
  }
  const file = fileChar.charCodeAt(0) - "a".charCodeAt(0);
  const rankNum = Number.parseInt(rankChar, 10);
  if (
    file < 0 ||
    file > 7 ||
    Number.isNaN(rankNum) ||
    rankNum < 1 ||
    rankNum > 8
  ) {
    return null;
  }
  const rankIndex = rankNum - 1;
  return { file, rankIndex };
}

/** Fractions of board width [0,1]: top-left of square, width/height of one cell. */
interface RelativeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const CELL = 1 / 8;

/**
 * Bounding box of a square in board-normalized coordinates (top-left origin).
 */
function squareToRelativeRect(
  square: string,
  orientation: "white" | "black"
): RelativeRect | null {
  const parsed = parseSquare(square);
  if (parsed === null) {
    return null;
  }
  const { file, rankIndex } = parsed;

  if (orientation === "white") {
    return {
      left: file * CELL,
      top: (7 - rankIndex) * CELL,
      width: CELL,
      height: CELL,
    };
  }

  return {
    left: (7 - file) * CELL,
    top: rankIndex * CELL,
    width: CELL,
    height: CELL,
  };
}

export type { RelativeRect, SquareIndices };
export { parseSquare, squareToRelativeRect };
