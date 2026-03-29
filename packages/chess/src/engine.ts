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

/** Search-depth presets for new games (maps to UCI `go depth N`). */
const ENGINE_DIFFICULTY_IDS = [
  "beginner",
  "casual",
  "club",
  "intermediate",
  "strong",
  "advanced",
  "expert",
  "maximum",
] as const;

type EngineDifficultyId = (typeof ENGINE_DIFFICULTY_IDS)[number];

/** @deprecated Use {@link EngineDifficultyId} for new code. */
type LegacyEngineDifficulty = "easy" | "medium" | "hard";

/**
 * Difficulty stored on a game document: eight presets or legacy `easy` / `medium` / `hard`.
 */
type GameDifficulty = EngineDifficultyId | LegacyEngineDifficulty;

/** @deprecated Alias for {@link GameDifficulty}. */
type DifficultyLevel = GameDifficulty;

/**
 * Engine depth configuration based on difficulty (non-linear spacing).
 */
const DIFFICULTY_DEPTH: Record<EngineDifficultyId, number> = {
  beginner: 8,
  casual: 10,
  club: 12,
  intermediate: 15,
  strong: 18,
  advanced: 22,
  expert: 26,
  maximum: 30,
};

const LEGACY_DEPTH: Record<LegacyEngineDifficulty, number> = {
  easy: 12,
  medium: 18,
  hard: 22,
};

/**
 * Get engine depth for a difficulty level
 */
function getEngineDepth(difficulty: GameDifficulty): number {
  if (
    difficulty === "easy" ||
    difficulty === "medium" ||
    difficulty === "hard"
  ) {
    return LEGACY_DEPTH[difficulty];
  }
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

/** Mate distance (positive = White mates in N; negative = Black mates in |N|). */
interface PositionEvaluationMate {
  type: "mate";
  value: number;
}

type PositionEvaluation = PositionEvaluationCp | PositionEvaluationMate;

/**
 * Get engine evaluation of the current position.
 * Result is normalized to White's perspective (positive = White better).
 *
 * @param fen - Current position in FEN notation
 * @param stockfish - Stockfish WASM instance
 * @returns Promise resolving to cp or mate evaluation from White's perspective
 */
async function getPositionEvaluation(
  fen: string,
  stockfish: StockfishInstance
): Promise<PositionEvaluation> {
  const isBlackToMove = fen.split(" ")[1] === "b";

  return new Promise((resolve, reject) => {
    let evaluation: PositionEvaluation | null = null;
    let isResolved = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      if (message.includes("score")) {
        const mateMatch = message.match(/score mate (-?\d+)/);
        const cpMatch = message.match(/score cp (-?\d+)/);
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
  type EngineDifficultyId,
  type GameDifficulty,
  type LegacyEngineDifficulty,
  type PositionEvaluation,
  type PositionEvaluationCp,
  type PositionEvaluationMate,
  type StockfishInstance,
  ENGINE_DIFFICULTY_IDS,
  DIFFICULTY_DEPTH,
  getEngineDepth,
  calculateBestMove,
  getPositionEvaluation,
};
