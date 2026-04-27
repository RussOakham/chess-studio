import type {
  EngineLine,
  GetTopEngineLinesOptions,
  StockfishInstance,
} from "./engine-types";
import { createUciSearchSession } from "./uci-search-session";
import { transportFromStockfishInstance } from "./uci-transport";

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
  const transport = transportFromStockfishInstance(stockfish);
  const session = createUciSearchSession(transport);
  try {
    const result = await session.run({ kind: "multiPv", fen, options });
    if (result.kind !== "multiPv") {
      throw new Error("Unexpected UCI search result kind");
    }
    return result.lines;
  } finally {
    session.dispose();
  }
}

export {
  DEFAULT_ENGINE_LINES_MULTIPV,
  ENGINE_LINES_DEFAULT_DEPTH,
  getTopEngineLines,
};
