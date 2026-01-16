"use client";

import { trpc } from "@/lib/trpc/client";
import { useRouter } from "next/navigation";
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
}

export function GameChessboard({
  position,
  orientation = "white",
  draggable = true,
  status,
  gameId,
}: GameChessboardProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const makeMove = trpc.games.makeMove.useMutation({
    onSuccess: () => {
      // Refresh the page to show updated game state
      router.refresh();
      setError(null);
    },
    onError: (error) => {
      setError(error.message || "Failed to make move");
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    },
  });

  function handleMove(move: { from: string; to: string; promotion?: string }) {
    if (status !== "in_progress") {
      setError("Game is not in progress");
      return;
    }

    setError(null);
    makeMove.mutate({
      gameId,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <ChessboardWrapper
        position={position}
        orientation={orientation}
        draggable={draggable && status === "in_progress" && !makeMove.isPending}
        onMove={handleMove}
      />
    </div>
  );
}
