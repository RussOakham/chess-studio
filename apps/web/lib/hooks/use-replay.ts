"use client";

import type { ReplayMove } from "@/lib/game-replay";

import {
  formatMoveHistory,
  getViewingFen,
  sortMovesByNumber,
} from "@/lib/game-replay";
import { useEffect, useMemo, useState } from "react";

/**
 * Replay state for navigating through game moves.
 * replayIndex 0 = start position, moves.length = live.
 */
export function useReplay<Move extends ReplayMove>(
  moves: Move[],
  gameFen: string | undefined
) {
  const [replayIndex, setReplayIndex] = useState(0);

  useEffect(() => {
    setReplayIndex(moves.length);
  }, [moves.length]);

  const sortedMoves = useMemo(() => sortMovesByNumber(moves), [moves]);

  const viewingFen = useMemo(
    () => getViewingFen(gameFen ?? "", replayIndex, sortedMoves),
    [gameFen, replayIndex, sortedMoves]
  );

  const isViewingLive = replayIndex === sortedMoves.length;

  const moveHistory = useMemo(
    () => formatMoveHistory(sortedMoves),
    [sortedMoves]
  );

  return {
    replayIndex,
    setReplayIndex,
    sortedMoves,
    viewingFen,
    isViewingLive,
    moveHistory,
  };
}
