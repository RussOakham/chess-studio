import { loading } from "./loading";

/** Game review page and mid-review mode copy. */
export const review = {
  title: "Game Review",
  pageLoadingGame: loading.game,
  pageLoadingReview: loading.review,
  gameNotFinished: "Game is not finished. Complete the game to review.",
  loadingEngine: "Loading chess engine…",
  evaluatingPositions: "Evaluating each position. This may take a moment.",
  startingAnalysis: "Starting analysis…",
  analyzingHeading: "Analyzing",
  openingPrefix: (opening: string) => `Opening: ${opening}`,
  coachAnalyzing: "Analyzing",
  coachProgress: (completed: number, total: number) =>
    `Move ${String(completed)} of ${String(total)}`,
  coachStarting: "Starting…",
  advantageOverTime: "Advantage over time",
  accuracy: "Accuracy",
  yourAccuracy: (pct: number) => `Your accuracy: ${String(pct)}%`,
  moveQuality: "Move quality",
  you: "You",
  engine: "Engine",
  engineMovesNotRated: "Engine moves not rated",
  countLabels: {
    best: "Best",
    good: "Good",
    book: "Book",
    inaccuracy: "Inaccuracy",
    mistake: "Mistake",
    blunder: "Blunder",
  },
  startReview: "Start Review",
  rerunAnalysis: "Re-run analysis",
  midReview: {
    sidebarTitle: "Game Review",
    backToOverview: "Back to overview",
    moveLine: (moveNumber: number, moveSan: string) =>
      `Move ${String(moveNumber)}: ${moveSan}`,
    reviewThisMove: "Review this move.",
    next: "Next",
    startPosition: "Start position. Use the move list or Next to step through.",
  },
  annotation: {
    bestWithSan: (san: string) => `Best move — engine prefers ${san}.`,
    bestFallback: "Best move.",
    goodWithSan: (san: string) => `Good move — engine prefers ${san}.`,
    goodFallback: "Good move.",
    inaccuracyWithSan: (san: string) => `Inaccuracy — engine prefers ${san}.`,
    inaccuracyFallback: "Inaccuracy — small eval slip.",
    blunderWithSan: (san: string) => `Blunder — engine prefers ${san}.`,
    blunderFallback: "Blunder.",
    mistakeWithSan: (san: string) => `Mistake — engine prefers ${san}.`,
    mistakeFallback: "Mistake.",
  },
  boardAria: {
    moveQualitySuffix: (type: string) => ` Move quality: ${type}.`,
    positionBeforeMove: (moveNumber: string, qualitySuffix: string) =>
      `Position before move ${moveNumber}. Green arrow shows engine best move; colored arrow shows your move.${qualitySuffix}`,
    gamePositionStep: (
      replayIndex: string,
      totalMoves: string,
      qualitySuffix: string
    ) =>
      `Game position at replay step ${replayIndex} of ${totalMoves}.${qualitySuffix}`,
  },
} as const;
