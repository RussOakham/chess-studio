// Engine service for Stockfish integration
// NOTE: Stockfish runs client-side only (Web Worker-based)
// This service validates and processes engine moves from the client

import { Chess } from "chess.js";

/** Minimal game shape needed for engine move validation (Convex game doc or equivalent). */
export interface GameWithFen {
  fen: string;
}

/**
 * Validate and process an engine move from the client
 * The actual Stockfish calculation happens client-side using useStockfish hook
 */
export function validateEngineMove(
  game: GameWithFen,
  move: {
    from: string;
    to: string;
    promotion?: string;
    uci: string;
  }
): {
  from: string;
  to: string;
  promotion?: string;
  uci: string;
  san: string;
} {
  // Validate move using chess.js to get SAN notation
  const chess = new Chess();
  chess.load(game.fen);

  const chessMove = chess.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  });

  if (!chessMove) {
    throw new Error("Engine returned invalid move");
  }

  return {
    from: chessMove.from,
    to: chessMove.to,
    promotion: chessMove.promotion,
    uci: move.uci,
    san: chessMove.san,
  };
}
