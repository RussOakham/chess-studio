import type { ExplorerMastersResponse } from "./types";

/** Only tag book moves in the first N full moves (config). */
const OPENING_MAX_PLY = 20;

/** Minimum share of games (0–1) where this continuation was played. */
const MIN_BOOK_SHARE = 0.05;

/** Or: move is among the top K continuations by frequency. */
const BOOK_TOP_K = 3;

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

  const scored = response.moves.map((moveRow) => {
    const games = moveRow.white + moveRow.draws + moveRow.black;
    const share = games / total;
    return { uci: normalizeUci(moveRow.uci), share, games };
  });

  const match = scored.find((scoredRow) => scoredRow.uci === target);
  if (match === undefined) {
    return false;
  }
  if (match.share >= MIN_BOOK_SHARE) {
    return true;
  }

  const sorted = [...scored];
  sorted.sort((left, right) => right.games - left.games);
  const rank = sorted.findIndex((scoredRow) => scoredRow.uci === target);
  return rank !== -1 && rank < BOOK_TOP_K;
}

/**
 * ECO + human name for the line after this book move, when Lichess provides it.
 * Prefers the matching row's `opening` (line after the move); falls back to position `opening`.
 */
function getBookOpeningLine(
  response: ExplorerMastersResponse,
  playedUci: string
): { eco: string; name: string } | undefined {
  const target = normalizeUci(playedUci);
  const row = response.moves.find(
    (moveRow) => normalizeUci(moveRow.uci) === target
  );
  if (row?.opening) {
    return { eco: row.opening.eco, name: row.opening.name };
  }
  if (response.opening) {
    return { eco: response.opening.eco, name: response.opening.name };
  }
  return undefined;
}

export {
  BOOK_TOP_K,
  getBookOpeningLine,
  isBookContinuation,
  MIN_BOOK_SHARE,
  normalizeUci,
  OPENING_MAX_PLY,
  totalGamesAtPosition,
};
