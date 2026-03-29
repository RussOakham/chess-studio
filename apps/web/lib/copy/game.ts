import { getEngineDifficultyShortTitle } from "./difficulty-presets";

/**
 * Active game page copy (board, sidebar, dialogs, post-game).
 * Loading line uses {@link loading.game} from `./loading`.
 */
export const game = {
  defaultUserDisplayName: "You",
  colors: {
    white: "White",
    black: "Black",
  },
  opponent: (difficulty: string) =>
    `Engine (${getEngineDifficultyShortTitle(difficulty)})`,
  turn: {
    prefix: "Turn:",
    unknown: "Unknown",
    error: "Error",
    engineThinking: "Engine thinking",
    white: "White",
    black: "Black",
  },
  result: {
    prefix: "Result:",
  },
  completionModal: {
    title: "Game Over",
    reviewGame: "Review game",
    backToDashboard: "Back to dashboard",
  },
  resign: {
    title: "Resign?",
    description: "Are you sure you want to resign? This will end the game.",
    cancel: "Cancel",
    confirm: "Resign",
    pending: "Resigning…",
    button: "Resign",
    failed: "Could not resign. Please try again.",
  },
  badges: {
    check: "Check",
    checkmate: "Checkmate",
    stalemate: "Stalemate",
    draw: "Draw",
  },
  replay: {
    viewingPastPosition:
      "Viewing past position — use controls to return to live",
  },
  info: {
    cardTitle: "Game Info",
    status: "Status:",
    created: "Created:",
    updated: "Updated:",
  },
  postGame: {
    playBotsTitle: "Play Bots",
    botMessage: "Great game! Open Game Review to see how you did.",
    completeReviewAvailable: "Game complete · Review available below",
    openingPrefix: (opening: string) => `Opening: ${opening}`,
    statGood: (count: number) => `${String(count)} Good`,
    statBest: (count: number) => `${String(count)} Best`,
    statInaccuracy: (count: number) => `${String(count)} Inaccuracy`,
    analyzing: "Analyzing…",
    analyzingProgress: (completed: number, total: number) =>
      ` Move ${completed} of ${total}`,
    reviewCta: "Game Review",
    reviewNewTabAria: "Open Game Review in new tab",
    newGame: "+ New Game",
    rematch: "Rematch",
  },
  pgn: {
    summaryTitle: "PGN (Portable Game Notation)",
    noMovesYet: "No moves yet",
    copy: "Copy PGN",
    copied: "Copied",
  },
  controls: {
    hint: "Hint",
    hintThinking: "Thinking…",
    hintLine: (san: string) => `Hint: ${san}`,
    hintAvailable: "Hint available",
  },
} as const;
