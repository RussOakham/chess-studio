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

/** Evaluation in centipawns (from White's perspective). */
interface PositionEvaluationCp {
  type: "cp";
  value: number;
}

/** Mate in N moves (positive = White wins, negative = Black wins). */
interface PositionEvaluationMate {
  type: "mate";
  value: number;
}

/** Position evaluation: centipawns or mate. */
type PositionEvaluation = PositionEvaluationCp | PositionEvaluationMate;

/**
 * Get engine evaluation of current position
 * @param fen - Current position in FEN notation
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to cp or mate evaluation
 */
async function getPositionEvaluation(
  fen: string,
  stockfish: StockfishInstance
): Promise<PositionEvaluation> {
  return new Promise((resolve, reject) => {
    let evaluation: PositionEvaluation | null = null;
    let isResolved = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      if (message.includes("score")) {
        const mateMatch = message.match(/score mate (-?\d+)/);
        const cpMatch = message.match(/score cp (-?\d+)/);
        if (mateMatch) {
          evaluation = {
            type: "mate",
            value: parseInt(mateMatch[1] ?? "0", 10),
          };
        } else if (cpMatch) {
          evaluation = {
            type: "cp",
            value: parseInt(cpMatch[1] ?? "0", 10),
          };
        }
      }

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
    }, 10000);

    stockfish.addEventListener("message", messageHandler);

    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage("go depth 5");
  });
}

export {
  type DifficultyLevel,
  type PositionEvaluation,
  type PositionEvaluationCp,
  type PositionEvaluationMate,
  type StockfishInstance,
  DIFFICULTY_DEPTH,
  getEngineDepth,
  calculateBestMove,
  getPositionEvaluation,
};
