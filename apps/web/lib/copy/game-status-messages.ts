/** Game over and turn-indicator messages (used by lib/game-status and lib/game-turn-status). */
export const gameStatusMessages = {
  gameOver: "Game over",
  whiteWins: "White wins",
  blackWins: "Black wins",
  draw: "Draw",
  turnIndicator: {
    serverError: "Server error",
    engineTurnOrCalculating: "Engine turn or calculating",
    playerTurn: "Player turn",
    error: "Error",
    engineThinking: "Engine thinking",
    enginesTurn: "Engine's turn",
    yourTurn: "Your turn",
  },
  statusDescription: {
    makeYourMove: "Make your move",
    waitingToStart: "Waiting to start",
    gameEnded: "Game ended",
  },
} as const;
