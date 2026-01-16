"use client";

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
}

export function GameChessboard({
  position,
  orientation = "white",
  draggable = true,
  status,
}: GameChessboardProps) {
  function handleMove(move: { from: string; to: string; promotion?: string }) {
    // TODO: Implement move handling in Phase 2.1
    // This will use tRPC mutation to save the move
    console.log("Move attempted:", move);
  }

  return (
    <ChessboardWrapper
      position={position}
      orientation={orientation}
      draggable={draggable && status === "in_progress"}
      onMove={handleMove}
    />
  );
}
