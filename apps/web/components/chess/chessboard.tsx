"use client";

import { Chess } from "chess.js";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useState } from "react";
import { Chessboard, defaultArrowOptions } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";

/** Styles keyed by square (e.g. "e1") for highlighting (e.g. king in check). */
type CustomSquareStyles = Record<string, CSSProperties>;

/** Arrow tuple: [from, to, optional color] — converted to react-chessboard v5 `Arrow`. */
type BoardArrow = [string, string, string?];

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
  /** Optional overlay (e.g. move-quality badge) drawn above the board, same size as the board */
  boardOverlay?: ReactNode;
}

function mapCustomArrowsToV5(arrows: BoardArrow[] | undefined) {
  if (arrows === undefined || arrows.length === 0) {
    return undefined;
  }
  return arrows.map(([startSquare, endSquare, color]) => ({
    startSquare,
    endSquare,
    color: color ?? defaultArrowOptions.color,
  }));
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
  boardOverlay,
}: ChessboardWrapperProps) {
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
      game.reset();
    }
    return game;
  }, [position]);

  const validPosition = useMemo(() => chess.fen(), [chess]);

  const [isMoving, setIsMoving] = useState(false);

  const defaultBoardWidth = boardWidth ?? 560;

  const boardStyle = useMemo(
    () => ({
      borderRadius: "4px",
      boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    }),
    []
  );

  const darkSquareStyle = useMemo(() => ({ backgroundColor: "#769656" }), []);

  const lightSquareStyle = useMemo(() => ({ backgroundColor: "#eeeed2" }), []);

  const boardBoxStyle = useMemo(
    () => ({
      width: defaultBoardWidth,
      height: defaultBoardWidth,
    }),
    [defaultBoardWidth]
  );

  const v5Arrows = useMemo(
    () => mapCustomArrowsToV5(customArrows),
    [customArrows]
  );

  const chessboardOptions = useMemo((): ChessboardOptions => {
    return {
      position: validPosition,
      boardOrientation: orientation,
      allowDragging: draggable,
      showNotation: showCoordinates,
      boardStyle,
      darkSquareStyle,
      lightSquareStyle,
      squareStyles: customSquareStyles,
      arrows: v5Arrows,
      onPieceDrop: ({ sourceSquare, targetSquare }) => {
        if (targetSquare === null) {
          return false;
        }
        if (isMoving) {
          return false;
        }
        try {
          const move = chess.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          });
          if (move === null) {
            return false;
          }
          if (onMove) {
            setIsMoving(true);
            onMove({
              from: sourceSquare,
              to: targetSquare,
              promotion: move.promotion,
            });
            setTimeout(() => setIsMoving(false), 100);
          }
          return true;
        } catch (error) {
          console.log({
            error: error,
            sourceSquare: sourceSquare,
            targetSquare: targetSquare,
          });
          return false;
        }
      },
    };
  }, [
    validPosition,
    orientation,
    draggable,
    showCoordinates,
    boardStyle,
    darkSquareStyle,
    lightSquareStyle,
    customSquareStyles,
    v5Arrows,
    chess,
    isMoving,
    onMove,
  ]);

  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className={boardWidth != null ? "w-full" : "w-full max-w-[600px]"}>
        <div className="relative shrink-0" style={boardBoxStyle}>
          <Chessboard options={chessboardOptions} />
          {boardOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-10">
              {boardOverlay}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export type { BoardArrow, CustomSquareStyles };
export { ChessboardWrapper };
