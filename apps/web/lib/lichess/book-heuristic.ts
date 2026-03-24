import type { ExplorerMastersResponse } from "./types";

/** Only tag book moves in the first N full moves (config). */
export const OPENING_MAX_PLY = 20;

/** Minimum share of games (0–1) where this continuation was played. */
export const MIN_BOOK_SHARE = 0.05;

/** Or: move is among the top K continuations by frequency. */
export const BOOK_TOP_K = 3;

function normalizeUci(uci: string): string {
  return uci.toLowerCase().trim();
}

function totalGamesAtPosition(response: ExplorerMastersResponse): number {
  return response.white + response.draws + response.black;
}

/**
 * True if the played move is a common book continuation at this position.
 */
function isBookContinuation(
  response: ExplorerMastersResponse,
  playedUci: string
): boolean {
  const target = normalizeUci(playedUci);
  const total = totalGamesAtPosition(response);
  if (total < 1) {
    return false;
  }

  const scored = response.moves.map((m) => {
    const games = m.white + m.draws + m.black;
    const share = games / total;
    return { uci: normalizeUci(m.uci), share, games };
  });

  const match = scored.find((s) => s.uci === target);
  if (match === undefined) {
    return false;
  }
  if (match.share >= MIN_BOOK_SHARE) {
    return true;
  }

  const sorted = [...scored].sort((a, b) => b.games - a.games);
  const rank = sorted.findIndex((s) => s.uci === target);
  return rank !== -1 && rank < BOOK_TOP_K;
}

export { isBookContinuation, normalizeUci, totalGamesAtPosition };
