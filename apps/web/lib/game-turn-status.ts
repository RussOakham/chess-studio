/**
 * Helpers for the turn/status indicator (dot and label) on the game page.
 */

import { gameStatusMessages } from "@/lib/copy";

interface TurnStatusParams {
  isMoveError: boolean;
  isEngineTurn: boolean;
  isCalculating: boolean;
  isMovePending: boolean;
}

const { turnIndicator } = gameStatusMessages;

/** Tailwind class for the status dot. */
function getTurnStatusColor(params: TurnStatusParams): string {
  if (params.isMoveError) {
    return "bg-red-500";
  }
  if (params.isEngineTurn || params.isCalculating || params.isMovePending) {
    return "bg-yellow-500";
  }
  return "bg-green-500";
}

/** Aria label for the status dot. */
function getTurnStatusLabel(params: TurnStatusParams): string {
  if (params.isMoveError) {
    return turnIndicator.serverError;
  }
  if (params.isEngineTurn || params.isCalculating || params.isMovePending) {
    return turnIndicator.engineTurnOrCalculating;
  }
  return turnIndicator.playerTurn;
}

/** Short text for the status indicator. */
function getTurnStatusText(params: TurnStatusParams): string {
  if (params.isMoveError) {
    return turnIndicator.error;
  }
  if (params.isCalculating || params.isMovePending) {
    return turnIndicator.engineThinking;
  }
  if (params.isEngineTurn) {
    return turnIndicator.enginesTurn;
  }
  return turnIndicator.yourTurn;
}

export type { TurnStatusParams };
export { getTurnStatusColor, getTurnStatusLabel, getTurnStatusText };
