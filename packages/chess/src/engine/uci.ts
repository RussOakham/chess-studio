import type { PositionEvaluation, StockfishInstance } from "./engine-types";

/**
 * Send UCI `stop` to abort an in-flight search (safe to call before a new `go`).
 */
export function sendUciStop(stockfish: StockfishInstance): void {
  stockfish.postMessage("stop");
}

/** True when UCI `bestmove` has no legal move (`none`, `(none)`, or missing; engines vary). */
export function isUciBestmoveNoMove(token: string | undefined): boolean {
  if (token === undefined) {
    return true;
  }
  const normalized = token.replace(/^\(|\)$/g, "");
  return normalized === "none" || normalized === "";
}

/**
 * Parse a single UCI `info` line that includes `multipv` and `score` / `pv`.
 * Returns null if the line is not a usable MultiPV info line.
 */
export function parseMultipvInfoLine(message: string): {
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

export function normalizeRawScoreToWhitePerspective(
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
