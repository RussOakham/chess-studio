"use client";

import type { Chess } from "chess.js";
import { useMemo } from "react";

/** Game doc shape with color and difficulty (for engine detection). */
interface GameLike {
  color: "white" | "black" | "random";
  difficulty?: string;
}

/**
 * Derives whether this is an engine game and whether it's the engine's turn.
 */
export function useEngineTurn(game: GameLike | null, chess: Chess | null) {
  return useMemo(() => {
    const isEngineGame = Boolean(game?.difficulty);
    if (!game || !chess || !isEngineGame) {
      return { isEngineGame: false, isEngineTurn: false };
    }
    const userColor: "white" | "black" =
      game.color === "random" ? "white" : game.color;
    const engineColor = userColor === "white" ? "black" : "white";
    const currentTurnColor = chess.turn() === "w" ? "white" : "black";
    return {
      isEngineGame: true,
      isEngineTurn: currentTurnColor === engineColor,
    };
  }, [game, chess]);
}
