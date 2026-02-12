"use client";

import { trpc } from "@/lib/trpc/client";
import { Chess } from "chess.js";
import { useMemo } from "react";

/**
 * Custom hook for managing game state
 * Provides game data, moves, and real-time updates
 */
export function useGame(gameId: string) {
  // Fetch game data with polling for real-time updates
  const {
    data: game,
    isLoading: gameLoading,
    isFetching: isGameFetching,
    error: gameError,
    refetch: refetchGame,
  } = trpc.games.getById.useQuery(
    { gameId },
    {
      // Poll every 2 seconds when game is in progress
      refetchInterval: (query) => {
        const gameData = query.state.data;
        return gameData?.status === "in_progress" ? 2000 : false;
      },
    }
  );

  // Fetch moves for the game
  const {
    data: moves = [],
    isLoading: movesLoading,
    error: movesError,
    refetch: refetchMoves,
  } = trpc.games.getMoves.useQuery(
    { gameId },
    {
      // Poll every 2 seconds when game is in progress (use game status from first query)
      refetchInterval: game?.status === "in_progress" ? 2000 : false,
      enabled: Boolean(game), // Only fetch moves if game exists
    }
  );

  // Create chess instance from current FEN to determine game state
  const chess = useMemo(() => {
    if (!game?.fen) {
      return null;
    }
    try {
      const chessInstance = new Chess();
      chessInstance.load(game.fen);
      return chessInstance;
    } catch {
      return null;
    }
  }, [game?.fen]);

  // Determine whose turn it is
  const currentTurn = useMemo(() => {
    if (!chess) {
      return null;
    }
    return chess.turn() === "w" ? "white" : "black";
  }, [chess]);

  // Check if game is in check
  const isInCheck = useMemo(() => {
    if (!chess) {
      return false;
    }
    return chess.isCheck();
  }, [chess]);

  // Check if game is in checkmate
  const isCheckmate = useMemo(() => {
    if (!chess) {
      return false;
    }
    return chess.isCheckmate();
  }, [chess]);

  // Check if game is in stalemate
  const isStalemate = useMemo(() => {
    if (!chess) {
      return false;
    }
    return chess.isStalemate();
  }, [chess]);

  // Check if game is a draw
  const isDraw = useMemo(() => {
    if (!chess) {
      return false;
    }
    return chess.isDraw();
  }, [chess]);

  // Refetch both game and moves
  const refetch = () => {
    void refetchGame();
    void refetchMoves();
  };

  return {
    game,
    moves,
    chess,
    currentTurn,
    isInCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isLoading: gameLoading || movesLoading,
    isGameFetching,
    error: gameError || movesError,
    refetch,
  };
}
