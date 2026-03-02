// oxlint-disable id-length
import { Chess } from "chess.js";

/**
 * Piece code (from chess.js) to Unicode symbol. Black pieces (lowercase), white (uppercase).
 * Note: Unicode chess symbols often don't scale with font-size. Future improvement: use
 * SVG or an icon set (e.g. lucide-chess or custom SVGs) for reliable sizing.
 */
const PIECE_SYMBOLS: Record<string, string> = {
  p: "\u265F", // ♟ black pawn
  n: "\u265E", // ♞ black knight
  b: "\u265D", // ♝ black bishop
  r: "\u265C", // ♜ black rook
  q: "\u265B", // ♛ black queen
  P: "\u2659", // ♙ white pawn
  N: "\u2658", // ♘ white knight
  B: "\u2657", // ♗ white bishop
  R: "\u2656", // ♖ white rook
  Q: "\u2655", // ♕ white queen
};

interface CapturedBySide {
  white: string[]; // Piece codes (lowercase) that white has captured
  black: string[]; // Piece codes (uppercase) that black has captured
}

/**
 * Replay moves and return captured pieces per side.
 * white[] = pieces captured by white (black piece codes, lowercase).
 * black[] = pieces captured by black (white piece codes, uppercase).
 */
function getCapturedPieces(moves: { moveUci: string }[]): CapturedBySide {
  const result: CapturedBySide = { white: [], black: [] };
  const chess = new Chess();
  for (const move of moves) {
    const uci = move.moveUci;
    if (uci.length >= 4) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      // UCI promotion character when present is one of q,r,b,n
      const promotion: "q" | "r" | "b" | "n" | undefined =
        uci.length >= 5
          ? // oxlint-disable-next-line no-unsafe-type-assertion -- UCI spec
            (uci[4] as "q" | "r" | "b" | "n")
          : undefined;
      const moveResult = chess.move({ from, to, promotion });
      if (moveResult?.captured) {
        // Capturing side: moveResult.color. chess.js captured is always lowercase piece type.
        // Result.white = black pieces captured (lowercase); result.black = white pieces captured (uppercase for PIECE_SYMBOLS).
        if (moveResult.color === "w") {
          result.white.push(moveResult.captured);
        } else {
          result.black.push(moveResult.captured.toUpperCase());
        }
      }
    }
  }
  return result;
}

/** Render captured piece codes as Unicode symbols (for display). */
function capturedToSymbols(pieceCodes: string[]): string[] {
  return pieceCodes.map((code) => PIECE_SYMBOLS[code] ?? code);
}

export { getCapturedPieces, capturedToSymbols, type CapturedBySide };
