// Shared chess logic and utilities

import type { Evaluation, Move } from "@repo/types";

/**
 * Chess board utilities
 */
const CHESS_BOARD_SIZE = 8;
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Validates a chess move notation
 */
function isValidMoveNotation(move: string): boolean {
  // Basic validation - can be enhanced
  return /^[a-h][1-8][a-h][1-8]([qrbn])?$/.test(move.toLowerCase());
}

/**
 * Converts a move to Standard Algebraic Notation (SAN)
 */
function toSAN(move: Move): string {
  return move.san;
}

/**
 * Parses FEN string
 */
function parseFEN(fen: string): {
  board: string;
  activeColor: "w" | "b";
  castling: string;
  enPassant: string;
  halfmove: number;
  fullmove: number;
} {
  const parts = fen.split(" ");
  return {
    board: parts[0] ?? "",
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    activeColor: (parts[1] as "w" | "b") ?? "w",
    castling: parts[2] ?? "-",
    enPassant: parts[3] ?? "-",
    halfmove: parseInt(parts[4] ?? "0", 10),
    fullmove: parseInt(parts[5] ?? "1", 10),
  };
}

/**
 * Formats evaluation score for display
 */
function formatEvaluation(evaluation: Evaluation): string {
  const score = evaluation.score / 100; // Convert centipawns to pawns
  return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}

export {
  CHESS_BOARD_SIZE,
  INITIAL_FEN,
  isValidMoveNotation,
  toSAN,
  parseFEN,
  formatEvaluation,
};
