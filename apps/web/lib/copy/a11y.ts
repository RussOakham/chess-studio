/** Accessible names and evaluation phrasing (screen readers). */
export const a11y = {
  replay: {
    jumpToStart: "Jump to start",
    previousMove: "Previous move",
    nextMove: "Next move",
    jumpToEnd: "Jump to end",
    play: "Play",
    pause: "Pause",
    labelStart: "Start",
    labelPrev: "Prev",
    labelNext: "Next",
    labelEnd: "End",
  },
  bookMove: "Book",
  gameChessboard: {
    notInProgress: "Game is not in progress",
    failedMove: "Failed to make move",
  },
  evaluation: {
    loading: "Evaluation loading",
    equal: "Evaluation: 0.0 — equal position",
    mateForWhite: (mateIn: number) => `Mate in ${String(mateIn)} for white`,
    mateForBlack: (mateIn: number) => `Mate in ${String(mateIn)} for black`,
    favour: (signedPawns: string, side: "white" | "black") =>
      `Evaluation: ${signedPawns} in favour of ${side}`,
  },
  sparkline: {
    overGame: "Evaluation over the game",
    withStep: (replayIndex: number, maxReplay: number) =>
      `Evaluation over the game, step ${String(replayIndex)} of ${String(maxReplay)}`,
  },
} as const;
