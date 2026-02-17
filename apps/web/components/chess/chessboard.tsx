"use client";

import type { ComponentProps, CSSProperties } from "react";

import { Chess } from "chess.js";
import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

/** Styles keyed by square (e.g. "e1") for highlighting (e.g. king in check). */
type CustomSquareStyles = Record<string, CSSProperties>;

/** Arrow tuple: [from, to, optional color] per react-chessboard customArrows. */
type BoardArrow = [string, string, string?];

type ChessboardArrow = ComponentProps<typeof Chessboard>["customArrows"];

interface ChessboardWrapperProps {
  /** FEN string representing the current board position */
  position: string;
  /** Board orientation - which side is at the bottom */
  orientation?: "white" | "black";
  /** Whether pieces can be moved via drag and drop */
  draggable?: boolean;
  /** Callback when a move is attempted */
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  /** Whether to show board coordinates */
  showCoordinates?: boolean;
  /** Custom board width (defaults to responsive) */
  boardWidth?: number;
  /** Optional per-square styles (e.g. highlight king in check) */
  customSquareStyles?: CustomSquareStyles;
  /** Optional arrows to draw (e.g. hint move) – [from, to, color?][] */
  customArrows?: BoardArrow[];
}

function ChessboardWrapper({
  position,
  orientation = "white",
  draggable = true,
  onMove,
  showCoordinates = true,
  boardWidth,
  customSquareStyles,
  customArrows,
}: ChessboardWrapperProps) {
  // Initialize chess instance with the current position
  // Update when position changes
  const chess = useMemo(() => {
    const game = new Chess();
    try {
      if (position?.trim()) {
        game.load(position);
      } else {
        game.reset();
      }
    } catch (error) {
      console.error("Invalid FEN position, using default:", {
        error: error,
        position: position,
      });
      // If position is invalid, start with default position
      game.reset();
    }
    return game;
  }, [position]);

  // Get the actual FEN from chess instance to ensure it's valid
  const validPosition = useMemo(() => chess.fen(), [chess]);

  // Track if a move is being processed
  const [isMoving, setIsMoving] = useState(false);

  /**
   * Handle piece drop - called when user drops a piece on a square
   * @returns true if move is legal, false otherwise
   */
  function onPieceDrop(sourceSquare: string, targetSquare: string): boolean {
    // Prevent moves while processing
    if (isMoving) {
      return false;
    }

    try {
      // Attempt to make the move
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q", // Always promote to queen for simplicity (can be made configurable later)
      });

      // If move is null, it's illegal
      if (move === null) {
        return false;
      }

      // Move is legal - notify parent component
      if (onMove) {
        setIsMoving(true);
        onMove({
          from: sourceSquare,
          to: targetSquare,
          promotion: move.promotion,
        });
        // Reset moving state after a short delay
        setTimeout(() => setIsMoving(false), 100);
      }

      return true;
    } catch (error) {
      console.log({
        error: error,
        sourceSquare: sourceSquare,
        targetSquare: targetSquare,
      });
      // Invalid move
      return false;
    }
  }

  // Set a default board width if not provided
  // Use responsive width based on viewport, but cap at 600px
  const defaultBoardWidth = boardWidth ?? 560;

  // Memoize style objects to prevent unnecessary re-renders
  const boardStyle = useMemo(
    () => ({
      borderRadius: "4px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    }),
    []
  );

  const darkSquareStyle = useMemo(() => ({ backgroundColor: "#769656" }), []);

  const lightSquareStyle = useMemo(() => ({ backgroundColor: "#eeeed2" }), []);

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="w-full max-w-[600px]">
        <Chessboard
          position={validPosition}
          onPieceDrop={onPieceDrop}
          boardOrientation={orientation}
          arePiecesDraggable={draggable}
          boardWidth={defaultBoardWidth}
          customBoardStyle={boardStyle}
          customDarkSquareStyle={darkSquareStyle}
          customLightSquareStyle={lightSquareStyle}
          customSquareStyles={customSquareStyles}
          customArrows={
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- hint from/to are valid Square strings
            customArrows as ChessboardArrow
          }
          showBoardNotation={showCoordinates}
        />
      </div>
    </div>
  );
}

export type { BoardArrow, CustomSquareStyles };
export { ChessboardWrapper };
