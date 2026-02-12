"use client";

import { trpc } from "@/lib/trpc/client";
import { Chess } from "chess.js";
import { useState } from "react";

import { ChessboardWrapper } from "./chessboard";

interface GameChessboardProps {
  /** FEN string representing the current board position */
  position: string;
  /** Board orientation - which side is at the bottom */
  orientation?: "white" | "black";
  /** Whether pieces can be moved via drag and drop */
  draggable?: boolean;
  /** Game status */
  status: string;
  /** Game ID */
  gameId: string;
  /** Optional callback to refetch game data after move */
  onMoveSuccess?: () => void;
}

export function GameChessboard({
  position,
  orientation = "white",
  draggable = true,
  status,
  gameId,
  onMoveSuccess,
}: GameChessboardProps) {
  const [error, setError] = useState<string | null>(null);
  const [optimisticFen, setOptimisticFen] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const makeMove = trpc.games.makeMove.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await utils.games.getById.cancel({ gameId });
      await utils.games.getMoves.cancel({ gameId });

      // Snapshot the previous value
      const previousGame = utils.games.getById.getData({ gameId });

      return { previousGame };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousGame) {
        utils.games.getById.setData({ gameId }, context.previousGame);
      }
      setOptimisticFen(null);
      setError(error.message || "Failed to make move client");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    },
    onSuccess: () => {
      // Clear optimistic state
      setOptimisticFen(null);
      // Invalidate and refetch game queries to get server state
      void utils.games.getById.invalidate({ gameId });
      void utils.games.getMoves.invalidate({ gameId });
      // Call optional callback
      if (onMoveSuccess) {
        onMoveSuccess();
      }
      setError(null);
    },
  });

  function handleMove(move: { from: string; to: string; promotion?: string }) {
    if (status !== "in_progress") {
      setError("Game is not in progress");
      return;
    }

    setError(null);

    // Calculate optimistic FEN immediately before mutation
    try {
      const optimisticChess = new Chess();
      optimisticChess.load(position);
      const promotion = move.promotion === "n" ? move.promotion : undefined;
      const chessMove = optimisticChess.move({
        from: move.from,
        to: move.to,
        promotion,
      });

      if (chessMove) {
        const newFen = optimisticChess.fen();
        setOptimisticFen(newFen);

        // Optimistically update the cache
        const previousGame = utils.games.getById.getData({ gameId });
        if (previousGame) {
          utils.games.getById.setData(
            { gameId },
            {
              ...previousGame,
              fen: newFen,
              pgn: optimisticChess.pgn(),
            }
          );
        }
      }
    } catch {
      // If optimistic update fails, continue with server call anyway
    }

    // Trigger the mutation
    makeMove.mutate({
      gameId,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
  }

  // Use optimistic FEN if available, otherwise use server position
  const displayPosition = optimisticFen ?? position;

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <ChessboardWrapper
        position={displayPosition}
        orientation={orientation}
        draggable={draggable && status === "in_progress" && !makeMove.isPending}
        onMove={handleMove}
      />
    </div>
  );
}
