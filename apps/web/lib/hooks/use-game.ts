"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { Chess } from "chess.js";
import { useQuery } from "convex/react";
import { useMemo } from "react";

/**
 * Convex-based game hook: real-time game and moves via Convex subscriptions.
 * No polling; data updates automatically when the game or moves change.
 */
export function useGame(gameId: string) {
  const gameDoc = useQuery(
    api.games.getById,
    gameId ? { gameId: toGameId(gameId) } : "skip"
  );
  const movesDoc = useQuery(
    api.games.getMoves,
    gameId ? { gameId: toGameId(gameId) } : "skip"
  );

  // Normalize to { id } shape for existing UI (Convex uses _id)
  const game = useMemo(() => {
    if (!gameDoc) {
      return null;
    }
    return { ...gameDoc, id: gameDoc._id };
  }, [gameDoc]);

  const moves = useMemo(() => {
    if (!movesDoc) {
      return [];
    }
    return movesDoc.map((move) => ({ ...move, id: move._id }));
  }, [movesDoc]);

  const chess = useMemo(() => {
    if (!game?.fen) {
      return null;
    }
    try {
      const instance = new Chess();
      instance.load(game.fen);
      return instance;
    } catch {
      return null;
    }
  }, [game?.fen]);

  const currentTurn = useMemo(() => {
    if (!chess) {
      return null;
    }
    return chess.turn() === "w" ? "white" : "black";
  }, [chess]);

  const isInCheck = useMemo(() => (chess ? chess.isCheck() : false), [chess]);
  const isCheckmate = useMemo(
    () => (chess ? chess.isCheckmate() : false),
    [chess]
  );
  const isStalemate = useMemo(
    () => (chess ? chess.isStalemate() : false),
    [chess]
  );
  const isDraw = useMemo(() => (chess ? chess.isDraw() : false), [chess]);

  const isLoading = gameDoc === undefined || movesDoc === undefined;

  return {
    game,
    moves,
    chess,
    currentTurn,
    isInCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isLoading,
    isGameFetching: false,
    error: null,
    refetch: () => {},
  };
}
