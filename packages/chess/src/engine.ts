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
    /** Ignore `bestmove` from a prior search until this run has sent `go`. */
    let acceptBestmove = false;

    // Set up message handler
    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      // Parse "bestmove e2e4" or "bestmove e2e4 ponder e7e5"
      if (message.startsWith("bestmove")) {
        if (!acceptBestmove) {
          return;
        }
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

    stockfish.addEventListener("message", messageHandler);
    sendUciStop(stockfish);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth ${depth}`);
    acceptBestmove = true;
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

/** One principal variation from a MultiPV search (1-based multipv index). */
interface EngineLine {
  multipv: number;
  evaluation: PositionEvaluation;
  movesUci: string[];
}

/** Options for {@link getTopEngineLines}. */
interface GetTopEngineLinesOptions {
  depth: number;
  /** Number of lines (UCI MultiPV), default 3. */
  multipv?: number;
}

const DEFAULT_ENGINE_LINES_MULTIPV = 3;

/** Default search depth for live/review “top lines” (snappier UX; raise in UI later if needed). */
const ENGINE_LINES_DEFAULT_DEPTH = 12;

/**
 * Send UCI `stop` to abort an in-flight search (safe to call before a new `go`).
 */
function sendUciStop(stockfish: StockfishInstance): void {
  stockfish.postMessage("stop");
}

/**
 * Parse a single UCI `info` line that includes `multipv` and `score` / `pv`.
 * Returns null if the line is not a usable MultiPV info line.
 */
function parseMultipvInfoLine(message: string): {
  multipv: number;
  score: { type: "cp" | "mate"; raw: number };
  movesUci: string[];
} | null {
  if (!message.startsWith("info ") || !message.includes("multipv")) {
    return null;
  }
  const multipvMatch = message.match(/\bmultipv\s+(\d+)\b/);
  if (multipvMatch === null) {
    return null;
  }
  const multipv = parseInt(multipvMatch[1] ?? "0", 10);
  if (multipv < 1 || Number.isNaN(multipv)) {
    return null;
  }

  let score: { type: "cp" | "mate"; raw: number } | null = null;
  const mateMatch = message.match(/\bscore\s+mate\s+(-?\d+)\b/);
  const cpMatch = message.match(/\bscore\s+cp\s+(-?\d+)\b/);
  if (mateMatch) {
    score = { type: "mate", raw: parseInt(mateMatch[1] ?? "0", 10) };
  } else if (cpMatch) {
    score = { type: "cp", raw: parseInt(cpMatch[1] ?? "0", 10) };
  } else {
    return null;
  }

  const pvIdx = message.indexOf(" pv ");
  const pvRest = pvIdx !== -1 ? message.slice(pvIdx + 4).trim() : "";
  const movesUci =
    pvRest.length > 0
      ? pvRest
          .split(/\s+/)
          .filter((uciMove) => /^[a-h][1-8][a-h][1-8]/.test(uciMove))
      : [];

  return { multipv, score, movesUci };
}

function normalizeRawScoreToWhitePerspective(
  score: { type: "cp" | "mate"; raw: number },
  isBlackToMove: boolean
): PositionEvaluation {
  if (score.type === "mate") {
    return {
      type: "mate",
      value: isBlackToMove ? -score.raw : score.raw,
    };
  }
  return {
    type: "cp",
    value: isBlackToMove ? -score.raw : score.raw,
  };
}

/**
 * Run a MultiPV search and return ranked engine lines (default 3).
 * Normalizes evaluations to White’s perspective (same convention as {@link getPositionEvaluation}).
 *
 * Sends `stop` first, then `setoption name MultiPV`, `position fen`, `go depth`.
 */
async function getTopEngineLines(
  fen: string,
  stockfish: StockfishInstance,
  options: GetTopEngineLinesOptions
): Promise<EngineLine[]> {
  const multipv = Math.min(
    500,
    Math.max(1, options.multipv ?? DEFAULT_ENGINE_LINES_MULTIPV)
  );
  const { depth } = options;
  const isBlackToMove = fen.split(" ")[1] === "b";

  return new Promise((resolve, reject) => {
    const state = new Map<
      number,
      { evaluation: PositionEvaluation; movesUci: string[] }
    >();
    let isResolved = false;
    /** Ignore MultiPV `info`/`bestmove` from a prior search until this run has sent `go`. */
    let acceptSearchMessages = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;

      if (
        acceptSearchMessages &&
        message.startsWith("info ") &&
        message.includes("multipv")
      ) {
        const parsed = parseMultipvInfoLine(message);
        if (parsed !== null) {
          const evaluation = normalizeRawScoreToWhitePerspective(
            parsed.score,
            isBlackToMove
          );
          state.set(parsed.multipv, {
            evaluation,
            movesUci: parsed.movesUci,
          });
        }
      }

      if (message.startsWith("bestmove")) {
        if (!acceptSearchMessages) {
          return;
        }
        const tokens = message.trim().split(/\s+/);
        const [, bestMoveToken] = tokens;
        if (!isResolved) {
          isResolved = true;
          stockfish.removeEventListener("message", messageHandler);
          clearTimeout(timeout);
          if (bestMoveToken === "(none)" || bestMoveToken === undefined) {
            resolve([]);
            return;
          }
          const lines: EngineLine[] = [];
          for (let lineRank = 1; lineRank <= multipv; lineRank++) {
            const row = state.get(lineRank);
            if (row !== undefined) {
              lines.push({
                multipv: lineRank,
                evaluation: row.evaluation,
                movesUci: row.movesUci,
              });
            }
          }
          resolve(lines);
        }
      }
    };

    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        stockfish.removeEventListener("message", messageHandler);
        reject(new Error("MultiPV engine lines timeout"));
      }
    }, 90000);

    stockfish.addEventListener("message", messageHandler);
    sendUciStop(stockfish);
    stockfish.postMessage(`setoption name MultiPV value ${String(multipv)}`);
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage(`go depth ${String(depth)}`);
    acceptSearchMessages = true;
  });
}

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
    /** Ignore `info`/`bestmove` from a prior search until this run has sent `go`. */
    let acceptSearchMessages = false;

    const messageHandler = (event: MessageEvent<string>) => {
      const message = event.data;
      if (acceptSearchMessages && message.includes("score")) {
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
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage("go depth 5");
    acceptSearchMessages = true;
  });
}

export {
  type DifficultyLevel,
  type EngineDifficultyId,
  type EngineLine,
  type GameDifficulty,
  type GetTopEngineLinesOptions,
  type LegacyEngineDifficulty,
  type PositionEvaluation,
  type PositionEvaluationCp,
  type PositionEvaluationMate,
  type StockfishInstance,
  DEFAULT_ENGINE_LINES_MULTIPV,
  ENGINE_DIFFICULTY_IDS,
  DIFFICULTY_DEPTH,
  ENGINE_LINES_DEFAULT_DEPTH,
  calculateBestMove,
  getEngineDepth,
  getPositionEvaluation,
  getTopEngineLines,
  parseMultipvInfoLine,
  sendUciStop,
};
