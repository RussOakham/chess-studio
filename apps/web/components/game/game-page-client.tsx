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
import { useGame } from "@/lib/hooks/use-game";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { useEffect, useRef } from "react";

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

export function GamePageClient({
  gameId,
  initialBoardOrientation = "white",
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
    refetch,
    chess,
  } = useGame(gameId);

  const utils = trpc.useUtils();

  // Stockfish engine hook (client-side only)
  const {
    isReady: isStockfishReady,
    isCalculating,
    getBestMove,
  } = useStockfish();

  // Ref to track the FEN when engine calculation starts (to prevent race conditions)
  const calculationFenRef = useRef<string | null>(null);

  // Ref to track if we just submitted an engine move (to prevent duplicate submissions)
  const justSubmittedEngineMoveRef = useRef(false);

  // Refs for stable access in engine effect (avoid effect re-running on every render)
  const makeMoveRef =
    useRef<
      (variables: {
        gameId: string;
        from: string;
        to: string;
        promotion?: string;
      }) => void
    >(null);
  const getBestMoveRef = useRef(getBestMove);
  const utilsRef = useRef(utils);
  getBestMoveRef.current = getBestMove;
  utilsRef.current = utils;

  // Make move mutation (used for both user and engine moves)
  const makeMove = trpc.games.makeMove.useMutation({
    onSuccess: () => {
      // Refetch game data after move (fire-and-forget)
      // eslint-disable-next-line typescript/no-floating-promises
      utils.games.getById.invalidate({ gameId });
      // eslint-disable-next-line typescript/no-floating-promises
      utils.games.getMoves.invalidate({ gameId });
      refetch();
      // Clear the flag after a delay to allow refetch to complete and prevent re-trigger
      // The delay ensures the effect won't re-run when game.fen updates
      setTimeout(() => {
        justSubmittedEngineMoveRef.current = false;
      }, 1500);
    },
    onError: (error) => {
      console.error("Move error:", error);
      justSubmittedEngineMoveRef.current = false;
      refetch();
    },
  });
  makeMoveRef.current = makeMove.mutate;

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
      const statusAtStart = game.status;

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

            // Verify game state hasn't changed before submitting
            // Get the latest game state from the query cache (with single retry if empty)
            let latestGameData = utilsRef.current.games.getById.getData({
              gameId: gameIdAtStart,
            });
            if (latestGameData === undefined) {
              // Single retry after brief delay to allow refetch to repopulate cache
              // eslint-disable-next-line promise/avoid-new -- standard delay pattern for cache settlement
              await new Promise<void>((resolve) => {
                setTimeout(resolve, 150);
              });
              latestGameData = utilsRef.current.games.getById.getData({
                gameId: gameIdAtStart,
              });
            }

            // Check if the calculation is still valid
            if (
              calculationFenRef.current !== fenAtStart ||
              !latestGameData ||
              latestGameData.fen !== fenAtStart ||
              latestGameData.id !== gameIdAtStart ||
              latestGameData.status !== statusAtStart ||
              justSubmittedEngineMoveRef.current
            ) {
              console.warn(
                "Game state changed during engine calculation, skipping move",
                {
                  expectedFen: fenAtStart,
                  currentFen: latestGameData?.fen,
                  expectedGameId: gameIdAtStart,
                  currentGameId: latestGameData?.id,
                  expectedStatus: statusAtStart,
                  currentStatus: latestGameData?.status,
                  alreadySubmitted: justSubmittedEngineMoveRef.current,
                }
              );
              calculationFenRef.current = null;
              return;
            }

            // Set flag to prevent duplicate submissions
            justSubmittedEngineMoveRef.current = true;

            // Clear the ref since we're about to submit
            calculationFenRef.current = null;

            // Execute the engine move via tRPC
            const mutateFn = makeMoveRef.current;
            if (mutateFn) {
              mutateFn({
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
  const boardOrientation: "white" | "black" = initialBoardOrientation;

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
                      if (isCalculating || makeMove.isPending) {
                        return "bg-yellow-500";
                      }
                      return "bg-green-500";
                    };

                    const getStatusLabel = () => {
                      if (makeMove.isError) {
                        return "Server error";
                      }
                      if (isCalculating || makeMove.isPending) {
                        return "Engine calculating move";
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
                    onMoveSuccess={refetch}
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
