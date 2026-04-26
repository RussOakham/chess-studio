/**
 * Helpers for game move replay and move history display.
 */

/** Minimal move shape for replay (from Convex moves). */
interface ReplayMove {
  moveNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  /** Convex document id when present (used by move list keys). */
  _id?: string;
}

/** Sorts moves by move number (Convex order may vary). */
function sortMovesByNumber<Move extends ReplayMove>(moves: Move[]): Move[] {
  const copy = [...moves];
  // eslint-disable-next-line unicorn/no-array-sort -- copy only; toSorted not in TS lib
  copy.sort((moveA, moveB) => moveA.moveNumber - moveB.moveNumber);
  return copy;
}

/** FEN for the position at the given replay index (0 = start, sortedMoves.length = live). */
function getViewingFen(
  gameFen: string,
  replayIndex: number,
  sortedMoves: ReplayMove[]
): string {
  if (replayIndex === sortedMoves.length) {
    return gameFen;
  }
  if (replayIndex === 0) {
    return sortedMoves[0]?.fenBefore ?? gameFen;
  }
  const move = sortedMoves[replayIndex - 1];
  return move?.fenAfter ?? gameFen;
}

/** Display row for a move (number, SAN, white/black). */
interface MoveHistoryRow extends ReplayMove {
  id: string;
  displayNumber?: number;
  isWhiteMove: boolean;
}

/** Formats sorted moves for the move history list. */
function formatMoveHistory<Move extends ReplayMove>(
  sortedMoves: Move[]
): (Move & MoveHistoryRow)[] {
  return sortedMoves.map((move) => {
    const movePairNumber = Math.ceil(move.moveNumber / 2);
    const isWhiteMove = move.moveNumber % 2 === 1;
    return {
      ...move,
      id:
        move._id !== undefined
          ? move._id
          : `${move.moveNumber}-${move.moveSan}`,
      displayNumber: isWhiteMove ? movePairNumber : undefined,
      isWhiteMove,
    };
  });
}

export type { MoveHistoryRow, ReplayMove };
export { formatMoveHistory, getViewingFen, sortMovesByNumber };
