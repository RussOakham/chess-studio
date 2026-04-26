import type { StockfishInstance } from "./engine-types";
import { isUciBestmoveNoMove, sendUciStop } from "./uci";

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
  // eslint-disable-next-line promise/avoid-new -- event-based worker protocol needs a promise boundary
  return new Promise((resolve, reject) => {
    let bestMove: string | null = null;
    let isResolved = false;
    /** Ignore `bestmove` from a prior search until this run has sent `go`. */
    let acceptBestmove = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      // Parse "bestmove e2e4" or "bestmove e2e4 ponder e7e5"
      if (message.startsWith("bestmove")) {
        if (!acceptBestmove) {
          return;
        }
        const [, moveToken] = message.trim().split(/\s+/);
        if (!isUciBestmoveNoMove(moveToken)) {
          bestMove = moveToken ?? null;
          if (!isResolved && bestMove) {
            isResolved = true;
            stockfish.removeEventListener("message", messageHandler);
            clearTimeout(timeout);
            resolve(bestMove);
          }
        } else {
          // No legal moves (checkmate/stalemate)
          if (!isResolved) {
            isResolved = true;
            stockfish.removeEventListener("message", messageHandler);
            clearTimeout(timeout);
            reject(new Error("No legal moves available"));
          }
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        stockfish.removeEventListener("message", messageHandler);
        reject(new Error("Engine calculation timeout"));
      }
    }, 30000); // 30 second timeout

    stockfish.addEventListener("message", messageHandler);
    sendUciStop(stockfish);
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`position fen ${fen}`);
    acceptBestmove = true;
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`go depth ${depth}`);
  });
}
