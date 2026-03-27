/**
 * Game list cards, status labels, and empty states.
 * Status display strings are the single source for list UIs and game-list-helpers.
 */
export const gameList = {
  status: {
    inProgress: "In Progress",
    waiting: "Waiting",
    completed: "Completed",
    abandoned: "Abandoned",
    draw: "Draw",
  },
  /** Badge on home “active” cards (distinct from list status line). */
  homeActiveBadge: {
    playing: "Playing",
    waiting: "Waiting",
  },
  sections: {
    activeGames: "Active Games",
    recentGames: "Recent Games",
  },
  viewAll: "View all →",
  empty: {
    noActiveGames: "No active games. Start a new game to begin playing!",
    noGamesYet: "No games yet. Start a new game to begin playing!",
    noCompletedGames:
      "No completed games yet. Your game history will appear here.",
  },
  gamesPage: {
    title: "Game History",
    subtitle: "All your games, including active and completed.",
    backToHome: "Back to Home",
  },
  actions: {
    createNewGame: "Create New Game",
    createNewGameArrow: "Create New Game →",
  },
  meta: {
    updatedPrefix: "Updated:",
    completedOn: (date: string) => `Completed: ${date}`,
    abandonedOn: (date: string) => `Abandoned: ${date}`,
  },
  gameCardTitle: (idPrefix: string) => `Game ${idPrefix}`,
} as const;
