/**
 * Helpers for the turn/status indicator (dot and label) on the game page.
 */

interface TurnStatusParams {
  isMoveError: boolean;
  isEngineTurn: boolean;
  isCalculating: boolean;
  isMovePending: boolean;
}

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
    return "Server error";
  }
  if (params.isEngineTurn || params.isCalculating || params.isMovePending) {
    return "Engine turn or calculating";
  }
  return "Player turn";
}

/** Short text for the status indicator. */
function getTurnStatusText(params: TurnStatusParams): string {
  if (params.isMoveError) {
    return "Error";
  }
  if (params.isCalculating || params.isMovePending) {
    return "Engine thinking";
  }
  if (params.isEngineTurn) {
    return "Engine's turn";
  }
  return "Your turn";
}

export type { TurnStatusParams };
export { getTurnStatusColor, getTurnStatusLabel, getTurnStatusText };
