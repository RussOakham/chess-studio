"use client";

import type { DifficultyLevel } from "@repo/chess";

import { GameChessboard } from "@/components/chess/game-chessboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { useGame } from "@/lib/hooks/use-game";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { useConvexConnectionState, useMutation } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
}

// Get status description
function getStatusDescription(status: string): string {
  if (status === "in_progress") {
    return "Make your move";
  }
  if (status === "waiting") {
    return "Waiting to start";
  }
  return "Game ended";
}

/**
 * Inner game content. Mounted with a key when Convex reconnects so useQuery
 * re-subscribes and receives the latest game state (avoids stale UI after
 * WebSocket disconnect/reconnect, e.g. from HMR).
 */
function GamePageContent({
  gameId,
  initialBoardOrientation,
}: GamePageClientProps) {
  const {
    game,
    moves,
    currentTurn,
    isInCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isLoading,
    isGameFetching,
    chess,
  } = useGame(gameId);

  // Stockfish engine hook (client-side only)
  const {
    isReady: isStockfishReady,
    isCalculating,
    getBestMove,
  } = useStockfish();

  const calculationFenRef = useRef<string | null>(null);
  const justSubmittedEngineMoveRef = useRef(false);
  const getBestMoveRef = useRef(getBestMove);
  getBestMoveRef.current = getBestMove;

  const makeMoveMutation = useMutation(api.games.makeMove);

  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMovePending, setIsMovePending] = useState(false);

  const makeMoveMutateWrapper = async (variables: {
    gameId: string;
    from: string;
    to: string;
    promotion?: string;
  }) => {
    setMoveError(null);
    setIsMovePending(true);
    try {
      await makeMoveMutation({
        gameId: toGameId(variables.gameId),
        from: variables.from,
        to: variables.to,
        promotion: variables.promotion,
      });
      setTimeout(() => {
        justSubmittedEngineMoveRef.current = false;
      }, 800);
    } catch (error: unknown) {
      console.error("Move error:", error);
      justSubmittedEngineMoveRef.current = false;
      setMoveError(
        error instanceof Error ? error.message : "Failed to make move"
      );
    } finally {
      setIsMovePending(false);
    }
  };

  const makeMoveRef = useRef(makeMoveMutateWrapper);
  makeMoveRef.current = makeMoveMutateWrapper;

  const makeMove = {
    mutate: makeMoveMutateWrapper,
    isPending: isMovePending,
    isError: Boolean(moveError),
    error: moveError,
  };

  // Check if it's an engine game and engine's turn
  const isEngineGame = Boolean(game?.difficulty);
  const isEngineTurn = (() => {
    if (!game || !chess || !isEngineGame) {
      return false;
    }

    const userColor = game.color === "random" ? "white" : game.color;
    const engineColor = userColor === "white" ? "black" : "white";
    const currentTurnColor = chess.turn() === "w" ? "white" : "black";

    return currentTurnColor === engineColor;
  })();

  // Auto-trigger engine move when it's engine's turn
  useEffect(() => {
    // Prevent duplicate submissions - if we just submitted a move, skip
    if (justSubmittedEngineMoveRef.current) {
      return;
    }

    if (
      isEngineGame &&
      isEngineTurn &&
      game?.status === "in_progress" &&
      !isGameFetching &&
      isStockfishReady &&
      !isCalculating &&
      !makeMove.isPending &&
      !isCheckmate &&
      !isStalemate &&
      !isDraw &&
      game?.difficulty &&
      game?.fen
    ) {
      // Capture all game state at the start to prevent race conditions
      const fenAtStart = game.fen;
      const gameIdAtStart = game.id;
      const difficultyAtStart = game.difficulty;

      // Store the FEN in ref to track this calculation
      calculationFenRef.current = fenAtStart;

      // Small delay to ensure UI updates after user move
      const timeout = setTimeout(() => {
        // Calculate engine move client-side and execute
        void (async () => {
          try {
            const getBestMoveFn = getBestMoveRef.current;
            if (!getBestMoveFn) {
              return;
            }
            const engineMove = await getBestMoveFn(
              fenAtStart,
              difficultyAtStart as DifficultyLevel
            );

            if (
              calculationFenRef.current !== fenAtStart ||
              justSubmittedEngineMoveRef.current
            ) {
              calculationFenRef.current = null;
              return;
            }

            justSubmittedEngineMoveRef.current = true;
            calculationFenRef.current = null;

            const mutateFn = makeMoveRef.current;
            if (mutateFn) {
              void mutateFn({
                gameId: gameIdAtStart,
                from: engineMove.from,
                to: engineMove.to,
                promotion: engineMove.promotion,
              });
            }
          } catch (error) {
            console.error("Failed to calculate engine move:", error);
            calculationFenRef.current = null;
            justSubmittedEngineMoveRef.current = false;
          }
        })();
      }, 500);

      return () => {
        clearTimeout(timeout);
        // Clear ref if effect is cleaned up (e.g., component unmounts or conditions change)
        if (calculationFenRef.current === fenAtStart) {
          calculationFenRef.current = null;
        }
      };
    }
  }, [
    isEngineGame,
    isEngineTurn,
    game?.status,
    game?.difficulty,
    game?.fen,
    game?.id,
    gameId,
    isGameFetching,
    isStockfishReady,
    isCalculating,
    makeMove.isPending,
    isCheckmate,
    isStalemate,
    isDraw,
  ]);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  // Determine board orientation based on game state
  // For now, default to white. Later we can use the color preference from game creation
  const boardOrientation: "white" | "black" =
    initialBoardOrientation ?? "white";

  // Format move history for display
  // Moves are numbered: 1 (white), 1 (black), 2 (white), 2 (black), etc.
  const moveHistory = moves.map((move) => {
    // Move number represents the full move pair (white + black)
    // For display: white moves show the number, black moves don't
    const movePairNumber = Math.ceil(move.moveNumber / 2);
    const isWhiteMove = move.moveNumber % 2 === 1;
    return {
      ...move,
      displayNumber: isWhiteMove ? movePairNumber : undefined,
      isWhiteMove,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Game {gameId.slice(0, 8)}</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Status:{" "}
                <span className="capitalize">
                  {game.status.replace("_", " ")}
                </span>
              </p>
              {game.status === "in_progress" && currentTurn && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">
                    Turn: <span className="capitalize">{currentTurn}</span>
                  </p>
                </>
              )}
              {isInCheck && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="destructive">Check</Badge>
                </>
              )}
              {isCheckmate && <Badge variant="destructive">Checkmate</Badge>}
              {isStalemate && <Badge variant="secondary">Stalemate</Badge>}
              {isDraw && <Badge variant="secondary">Draw</Badge>}
            </div>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Chessboard Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="relative">
                <CardTitle>Chessboard</CardTitle>
                <CardDescription>
                  {getStatusDescription(game.status)}
                </CardDescription>
                {/* Fixed-size status indicator (always rendered to prevent CLS) */}
                {game.status === "in_progress" &&
                  (() => {
                    const getStatusColor = () => {
                      if (makeMove.isError) {
                        return "bg-red-500";
                      }
                      if (isEngineTurn || isCalculating || makeMove.isPending) {
                        return "bg-yellow-500";
                      }
                      return "bg-green-500";
                    };

                    const getStatusLabel = () => {
                      if (makeMove.isError) {
                        return "Server error";
                      }
                      if (isEngineTurn || isCalculating || makeMove.isPending) {
                        return "Engine turn or calculating";
                      }
                      return "Player turn";
                    };

                    const getStatusText = () => {
                      if (makeMove.isError) {
                        return "Error";
                      }
                      if (isCalculating || makeMove.isPending) {
                        return "Engine thinking";
                      }
                      if (isEngineTurn) {
                        return "Engine's turn";
                      }
                      return "Your turn";
                    };

                    return (
                      <div className="absolute top-4 right-4 flex h-5 items-center gap-2">
                        <div
                          className={`h-3 w-3 shrink-0 rounded-full ${getStatusColor()}`}
                          aria-label={getStatusLabel()}
                        />
                        <span className="text-xs whitespace-nowrap text-muted-foreground">
                          {getStatusText()}
                        </span>
                      </div>
                    );
                  })()}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <GameChessboard
                    position={game.fen}
                    orientation={boardOrientation}
                    draggable={
                      game.status === "in_progress" &&
                      !isEngineTurn &&
                      !isCalculating &&
                      !makeMove.isPending
                    }
                    status={game.status}
                    gameId={game.id}
                    onMoveSuccess={undefined}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Info Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {game.status.replace("_", " ")}
                  </p>
                </div>
                {game.status === "in_progress" && currentTurn && (
                  <div>
                    <p className="text-sm font-medium">Turn</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {currentTurn}
                    </p>
                  </div>
                )}
                {game.result && (
                  <div>
                    <p className="text-sm font-medium">Result</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {game.result.replace("_", " ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(game.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Game Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {game.status === "in_progress" && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled
                    // TODO: Implement resign in Phase 3.2
                  >
                    Resign
                  </Button>
                )}
                {game.status === "in_progress" && (
                  <Button variant="outline" className="w-full" disabled>
                    Offer Draw
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
                <CardDescription>
                  {moves.length === 0
                    ? "No moves yet"
                    : `${moves.length} move${moves.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Move history will appear here as you play
                  </p>
                ) : (
                  <div className="max-h-96 space-y-1 overflow-y-auto">
                    {moveHistory.map((move) => (
                      <div
                        key={move.id}
                        className="flex items-center gap-2 rounded p-2 text-sm hover:bg-muted"
                      >
                        {move.displayNumber && (
                          <span className="font-medium text-muted-foreground">
                            {move.displayNumber}.
                          </span>
                        )}
                        <span
                          className={
                            move.isWhiteMove
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {move.moveSan}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/** When Convex WebSocket reconnects, remount game content so subscriptions get latest state. */
export function GamePageClient(props: GamePageClientProps) {
  const connectionState = useConvexConnectionState();
  const wasDisconnectedRef = useRef(false);
  const [connectionRefreshKey, setConnectionRefreshKey] = useState(0);

  useEffect(() => {
    const connected = connectionState?.isWebSocketConnected ?? false;
    if (wasDisconnectedRef.current && connected) {
      setConnectionRefreshKey((prev) => prev + 1);
      wasDisconnectedRef.current = false;
    } else if (!connected) {
      wasDisconnectedRef.current = true;
    }
  }, [connectionState?.isWebSocketConnected]);

  return (
    <GamePageContent
      key={connectionRefreshKey}
      gameId={props.gameId}
      initialBoardOrientation={props.initialBoardOrientation}
    />
  );
}
