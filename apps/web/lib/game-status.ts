import type { Chess } from "chess.js";

/**
 * Human-readable status description for the game page header.
 */
function getStatusDescription(status: string): string {
  if (status === "in_progress") {
    return "Make your move";
  }
  if (status === "waiting") {
    return "Waiting to start";
  }
  return "Game ended";
}

/**
 * Get the square of the king in check (side to move).
 * Returns null if not in check or chess instance is null.
 */
function getKingSquareInCheck(chess: Chess | null): string | null {
  if (!chess || !chess.isCheck()) {
    return null;
  }
  const board = chess.board();
  const turn = chess.turn();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row]?.[col];
      if (piece?.type === "k" && piece.color === turn) {
        return `${"abcdefgh"[col]}${8 - row}`;
      }
    }
  }
  return null;
}

type GameResult = "white_wins" | "black_wins" | "draw";

/**
 * Human-readable game over message from game result.
 */
function getGameOverMessage(result: GameResult | undefined): string {
  if (!result) {
    return "Game over";
  }
  if (result === "white_wins") {
    return "White wins";
  }
  if (result === "black_wins") {
    return "Black wins";
  }
  return "Draw";
}

/** Square styles for highlighting (e.g. king in check). */
type KingInCheckSquareStyles = Record<string, { boxShadow: string }>;

/** Styles for the king-in-check square, or undefined if not in check. */
function getKingInCheckSquareStyles(
  chess: Chess | null
): KingInCheckSquareStyles | undefined {
  const square = getKingSquareInCheck(chess);
  if (!square) {
    return undefined;
  }
  return {
    [square]: {
      boxShadow: "inset 0 0 0 3px rgba(220, 38, 38, 0.8)",
    },
  };
}

/** Styles for hint from/to squares (distinct from king-in-check). */
function getHintSquareStyles(
  from: string | undefined,
  to: string | undefined
): Record<string, { boxShadow: string }> | undefined {
  if (!from || !to) {
    return undefined;
  }
  const hintStyle = {
    boxShadow: "inset 0 0 0 3px rgba(34, 197, 94, 0.8)",
  };
  return {
    [from]: hintStyle,
    [to]: hintStyle,
  };
}

export type { KingInCheckSquareStyles };
export {
  getGameOverMessage,
  getHintSquareStyles,
  getKingSquareInCheck,
  getKingInCheckSquareStyles,
  getStatusDescription,
};
