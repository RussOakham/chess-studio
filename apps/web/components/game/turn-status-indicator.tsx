"use client";

import { game as gameCopy } from "@/lib/copy";
import { getTurnStatusLabel } from "@/lib/game-turn-status";

/**
 * Turn cell for Game Info grid: "Turn:" + traffic light (white / yellow / black dot) + label.
 * States: White (white dot), Engine thinking (yellow), Black (black dot). Error keeps red.
 */
export function TurnStatusIndicator({
  makeMove,
  isEngineTurn,
  isCalculating,
  currentTurn,
}: {
  makeMove: { isError: boolean; isPending: boolean };
  isEngineTurn: boolean;
  isCalculating: boolean;
  currentTurn: string | null;
}) {
  const isEngineActive = isEngineTurn || isCalculating || makeMove.isPending;
  const params = {
    isMoveError: makeMove.isError,
    isEngineTurn,
    isCalculating,
    isMovePending: makeMove.isPending,
  };

  let dotClass = "bg-neutral-800 ring-1 ring-border dark:bg-neutral-600";
  let label: string = gameCopy.turn.unknown;
  if (makeMove.isError) {
    dotClass = "bg-red-500";
    label = gameCopy.turn.error;
  } else if (isEngineActive) {
    dotClass = "bg-yellow-500";
    label = gameCopy.turn.engineThinking;
  } else if (currentTurn === "white") {
    dotClass = "bg-white ring-1 ring-border";
    label = gameCopy.colors.white;
  } else if (currentTurn === "black") {
    dotClass = "bg-neutral-800 ring-1 ring-border dark:bg-neutral-600";
    label = gameCopy.colors.black;
  }

  return (
    <div className="flex h-5 items-center gap-2">
      <span className="font-medium text-foreground">
        {gameCopy.turn.prefix}
      </span>
      <div
        className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`}
        aria-label={getTurnStatusLabel(params)}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
