import type { PositionEvaluation, StockfishInstance } from "./engine-types";
import { createUciSearchSession } from "./uci-search-session";
import { transportFromStockfishInstance } from "./uci-transport";

/**
 * Get engine evaluation of the current position.
 * Result is normalized to White's perspective (positive = White better).
 *
 * @param fen - Current position in FEN notation
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to cp or mate evaluation from White's perspective
 */
export async function getPositionEvaluation(
  fen: string,
  stockfish: StockfishInstance
): Promise<PositionEvaluation> {
  const transport = transportFromStockfishInstance(stockfish);
  const session = createUciSearchSession(transport);
  const result = await session.run({ kind: "evaluation", fen, depth: 5 });
  session.dispose();
  if (result.kind !== "evaluation") {
    throw new Error("Unexpected UCI search result kind");
  }
  return result.evaluation;
}
