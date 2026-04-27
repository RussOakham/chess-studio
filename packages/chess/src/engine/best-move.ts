import type { StockfishInstance } from "./engine-types";
import { createUciSearchSession } from "./uci-search-session";
import { transportFromStockfishInstance } from "./uci-transport";

/**
 * Calculate best move using Stockfish engine
 * @param fen - Current position in FEN notation
 * @param depth - Search depth (higher = stronger, slower)
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to best move in UCI format (e.g., "e2e4")
 */
export async function calculateBestMove(
  fen: string,
  depth: number,
  stockfish: StockfishInstance
): Promise<string> {
  const transport = transportFromStockfishInstance(stockfish);
  const session = createUciSearchSession(transport);
  const result = await session.run({ kind: "bestMove", fen, depth });
  session.dispose();
  if (result.kind !== "bestMove") {
    throw new Error("Unexpected UCI search result kind");
  }
  return result.bestMoveUci;
}
