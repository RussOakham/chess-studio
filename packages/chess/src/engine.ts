// Stockfish engine utilities for chess analysis

/**
 * Stockfish instance type (Web Worker-like interface)
 * Uses native MessageEvent from DOM types
 */
interface StockfishInstance {
  postMessage: (message: string) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent<string>) => void
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (event: MessageEvent<string>) => void
  ) => void;
  terminate: () => void;
}

/**
 * Difficulty level configuration
 */
type DifficultyLevel = "easy" | "medium" | "hard";

/**
 * Engine depth configuration based on difficulty
 */
const DIFFICULTY_DEPTH: Record<DifficultyLevel, number> = {
  easy: 12,
  medium: 18,
  hard: 22,
};

/**
 * Get engine depth for a difficulty level
 */
function getEngineDepth(difficulty: DifficultyLevel): number {
  return DIFFICULTY_DEPTH[difficulty];
}

/**
 * Calculate best move using Stockfish engine
 * @param fen - Current position in FEN notation
 * @param depth - Search depth (higher = stronger, slower)
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to best move in UCI format (e.g., "e2e4")
 */
async function calculateBestMove(
  fen: string,
  depth: number,
  stockfish: StockfishInstance
): Promise<string> {
  return new Promise((resolve, reject) => {
    let bestMove: string | null = null;
    let isResolved = false;

    // Set up message handler
    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      // Parse "bestmove e2e4" or "bestmove e2e4 ponder e7e5"
      if (message.startsWith("bestmove")) {
        const parts = message.split(" ");
        if (parts[1] && parts[1] !== "none") {
          bestMove = parts[1] ?? null;
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

    // Set timeout for engine calculation
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        stockfish.removeEventListener("message", messageHandler);
        reject(new Error("Engine calculation timeout"));
      }
    }, 30000); // 30 second timeout

    // Add message listener
    stockfish.addEventListener("message", messageHandler);

    // Send position and start calculation
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth ${depth}`);
  });
}

/**
 * Get engine evaluation of current position
 * @param fen - Current position in FEN notation
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to evaluation in centipawns
 */
async function getPositionEvaluation(
  fen: string,
  stockfish: StockfishInstance
): Promise<number> {
  return new Promise((resolve, reject) => {
    let evaluation: number | null = null;
    let isResolved = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      // Parse "info depth X score cp Y" or "info depth X score mate Y"
      if (message.includes("score")) {
        const scoreMatch = message.match(/score (?:cp|mate) (-?\d+)/);
        if (scoreMatch) {
          evaluation = parseInt(scoreMatch[1] ?? "0", 10);
        }
      }

      // When we get "bestmove", we have the final evaluation
      if (message.startsWith("bestmove")) {
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
    }, 10000); // 10 second timeout for evaluation

    stockfish.addEventListener("message", messageHandler);

    // Get quick evaluation (depth 5)
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage("go depth 5");
  });
}

export {
  type DifficultyLevel,
  type StockfishInstance,
  DIFFICULTY_DEPTH,
  getEngineDepth,
  calculateBestMove,
  getPositionEvaluation,
};
