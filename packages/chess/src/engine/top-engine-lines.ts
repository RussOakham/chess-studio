import type {
  EngineLine,
  GetTopEngineLinesOptions,
  PositionEvaluation,
  StockfishInstance,
} from "./engine-types";
import {
  isUciBestmoveNoMove,
  normalizeRawScoreToWhitePerspective,
  parseMultipvInfoLine,
  sendUciStop,
} from "./uci";

const DEFAULT_ENGINE_LINES_MULTIPV = 3;

/** Default search depth for live/review “top lines” (snappier UX; raise in UI later if needed). */
const ENGINE_LINES_DEFAULT_DEPTH = 12;

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

  // eslint-disable-next-line promise/avoid-new -- event-based worker protocol needs a promise boundary
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
          if (isUciBestmoveNoMove(bestMoveToken)) {
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
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`setoption name MultiPV value ${String(multipv)}`);
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`position fen ${fen}`);
    acceptSearchMessages = true;
    // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
    stockfish.postMessage(`go depth ${String(depth)}`);
  });
}

export {
  DEFAULT_ENGINE_LINES_MULTIPV,
  ENGINE_LINES_DEFAULT_DEPTH,
  getTopEngineLines,
};
