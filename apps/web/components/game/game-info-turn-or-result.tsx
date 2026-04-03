"use client";

import { TurnStatusIndicator } from "@/components/game/turn-status-indicator";
import type { Doc } from "@/convex/_generated/dataModel";
import { game as gameCopy } from "@/lib/copy";

export function GameInfoTurnOrResult({
  game,
  makeMove,
  isEngineTurn,
  isCalculating,
  currentTurn,
}: {
  game: Doc<"games">;
  makeMove: { isError: boolean; isPending: boolean };
  isEngineTurn: boolean;
  isCalculating: boolean;
  currentTurn: string | null;
}) {
  if (game.status === "in_progress") {
    return (
      <TurnStatusIndicator
        makeMove={makeMove}
        isEngineTurn={isEngineTurn}
        isCalculating={isCalculating}
        currentTurn={currentTurn}
      />
    );
  }
  if (game.result) {
    return (
      <>
        <span className="font-medium text-foreground">
          {gameCopy.result.prefix}
        </span>{" "}
        <span className="capitalize">{game.result.replaceAll("_", " ")}</span>
      </>
    );
  }
  return "—";
}
