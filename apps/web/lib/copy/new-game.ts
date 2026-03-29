/** New game creation form copy. */
export const newGame = {
  title: "New Game",
  description:
    "Choose your difficulty level and color to start a new chess game",
  fields: {
    difficulty: "Difficulty",
    color: "Play As",
  },
  difficultyLegend:
    "Higher settings search deeper. Engine strength and think time don't increase evenly — engine turns at higher settings take longer for smaller gains in playing strength.",
  color: {
    white: "White",
    black: "Black",
    random: "Random",
  },
  actions: {
    cancel: "Cancel",
    startGame: "Start Game",
    creating: "Creating game...",
  },
  errors: {
    failedCreate: "Failed to create game",
  },
  validation: {
    difficultyRequired: "Please select a difficulty level",
    colorRequired: "Please select a color",
    invalidDifficulty: "Please select a valid difficulty level",
    invalidColor: "Please select a valid color",
  },
} as const;
