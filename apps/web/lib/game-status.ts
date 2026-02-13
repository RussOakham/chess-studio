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

export { getGameOverMessage, getKingSquareInCheck, getStatusDescription };
