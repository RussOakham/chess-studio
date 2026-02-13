"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { Chess } from "chess.js";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { ChessboardWrapper } from "./chessboard";

interface GameChessboardProps {
  position: string;
  orientation?: "white" | "black";
  draggable?: boolean;
  status: string;
  gameId: string;
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
  const [isPending, setIsPending] = useState(false);
  const errorClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorClearTimerRef.current !== null) {
        clearTimeout(errorClearTimerRef.current);
      }
    };
  }, []);

  const makeMoveMutation = useMutation(api.games.makeMove);

  async function handleMove(move: {
    from: string;
    to: string;
    promotion?: string;
  }) {
    if (status !== "in_progress") {
      setError("Game is not in progress");
      return;
    }

    setError(null);

    try {
      const optimisticChess = new Chess();
      optimisticChess.load(position);
      const promotion = move.promotion ?? undefined;
      const chessMove = optimisticChess.move({
        from: move.from,
        to: move.to,
        promotion,
      });

      if (chessMove) {
        setOptimisticFen(optimisticChess.fen());
      }
    } catch {
      // Continue with server call
    }

    setIsPending(true);
    try {
      await makeMoveMutation({
        gameId: toGameId(gameId),
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      setOptimisticFen(null);
      onMoveSuccess?.();
      setError(null);
    } catch (error: unknown) {
      setOptimisticFen(null);
      setError(error instanceof Error ? error.message : "Failed to make move");
      if (errorClearTimerRef.current !== null) {
        clearTimeout(errorClearTimerRef.current);
      }
      errorClearTimerRef.current = setTimeout(() => setError(null), 3000);
    } finally {
      setIsPending(false);
    }
  }

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
        draggable={draggable && status === "in_progress" && !isPending}
        onMove={handleMove}
      />
    </div>
  );
}
