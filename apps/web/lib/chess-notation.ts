import { Chess } from "chess.js";

/**
 * Get Standard Algebraic Notation (SAN) for a move in a position.
 * Returns null if FEN is invalid or the move is illegal.
 */
export function getSanForMove(
  fen: string,
  from: string,
  to: string,
  promotion?: string
): string | null {
  try {
    const chess = new Chess();
    chess.load(fen);
    const move = chess.move({
      from,
      to,
      promotion: promotion ?? undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}
