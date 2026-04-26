import type { PositionEvaluation, StockfishInstance } from "./engine-types";
import { sendUciStop } from "./uci";

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
  const isBlackToMove = fen.split(" ")[1] === "b";

  // eslint-disable-next-line promise/avoid-new -- event-based worker protocol needs a promise boundary
  return new Promise((resolve, reject) => {
    let evaluation: PositionEvaluation | null = null;
    let isResolved = false;
    /** Ignore `info`/`bestmove` from a prior search until this run has sent `go`. */
    let acceptSearchMessages = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      if (acceptSearchMessages && message.includes("score")) {
        const mateMatch = /score mate (-?\d+)/.exec(message);
        const cpMatch = /score cp (-?\d+)/.exec(message);
        if (mateMatch) {
          const raw = parseInt(mateMatch[1] ?? "0", 10);
          evaluation = {
            type: "mate",
            value: isBlackToMove ? -raw : raw,
          };
        } else if (cpMatch) {
          const raw = parseInt(cpMatch[1] ?? "0", 10);
          evaluation = {
            type: "cp",
            value: isBlackToMove ? -raw : raw,
          };
        }
      }

      if (message.startsWith("bestmove")) {
        if (!acceptSearchMessages) {
          return;
        }
        if (!isResolved) {
          isResolved = true;
          stockfish.removeEventListener("message", messageHandler);
          clearTimeout(timeout);
          if (evaluation !== null) {
            resolve(evaluation);
          } else {
            reject(new Error("Could not get evaluation"));
          }
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        stockfish.removeEventListener("message", messageHandler);
        reject(new Error("Evaluation timeout"));
      }
    }, 10000);

    stockfish.addEventListener("message", messageHandler);
    sendUciStop(stockfish);
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`position fen ${fen}`);
    acceptSearchMessages = true;
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage("go depth 5");
  });
}
