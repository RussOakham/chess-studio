"use client";

import type { DifficultyLevel, PositionEvaluation } from "@repo/chess";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { GameChessboard } from "@/components/chess/game-chessboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  getGameOverMessage,
  getKingSquareInCheck,
  getStatusDescription,
} from "@/lib/game-status";
import { useGame } from "@/lib/hooks/use-game";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { useConvexConnectionState, useMutation } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
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
    getEvaluation,
  } = useStockfish();

  const calculationFenRef = useRef<string | null>(null);
  const justSubmittedEngineMoveRef = useRef(false);
  const getBestMoveRef = useRef(getBestMove);
  getBestMoveRef.current = getBestMove;

  const makeMoveMutation = useMutation(api.games.makeMove);
  const resignMutation = useMutation(api.games.resign);

  const router = useRouter();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMovePending, setIsMovePending] = useState(false);
  const [isResigning, setIsResigning] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [pgnCopied, setPgnCopied] = useState(false);
  const [evaluation, setEvaluation] = useState<PositionEvaluation | null>(null);
  const evaluationFenRef = useRef<string | null>(null);
  const getEvaluationRef = useRef(getEvaluation);
  getEvaluationRef.current = getEvaluation;

  // Replay: 0 = initial position, moves.length = live. Jump to live when new move is added.
  const [replayIndex, setReplayIndex] = useState(0);
  useEffect(() => {
    setReplayIndex(moves.length);
  }, [moves.length]);

  const makeMoveMutateWrapper = useCallback(
    async (variables: {
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
    },
    [makeMoveMutation]
  );

  const makeMoveRef = useRef(makeMoveMutateWrapper);
  makeMoveRef.current = makeMoveMutateWrapper;

  const makeMove = useMemo(
    () => ({
      mutate: makeMoveMutateWrapper,
      isPending: isMovePending,
      isError: Boolean(moveError),
      error: moveError,
    }),
    [makeMoveMutateWrapper, isMovePending, moveError]
  );

  const isGameOver = game?.status === "completed";
  const kingSquareInCheck = useMemo(() => getKingSquareInCheck(chess), [chess]);
  const customSquareStyles = useMemo(() => {
    if (!kingSquareInCheck) {
      return undefined;
    }
    return {
      [kingSquareInCheck]: {
        boxShadow: "inset 0 0 0 3px rgba(220, 38, 38, 0.8)",
      },
    };
  }, [kingSquareInCheck]);
  const gameOverMessage = getGameOverMessage(game?.result);

  /**
   * Debounced position evaluation for the evaluation bar.
   * Runs only when game is in progress and Stockfish is ready; skips when engine is calculating.
   */
  useEffect(() => {
    if (game?.status !== "in_progress" || !isStockfishReady || isCalculating) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const requestedFen = game.fen;
      evaluationFenRef.current = requestedFen;
      void (async () => {
        try {
          const ev = await getEvaluationRef.current(requestedFen);
          if (evaluationFenRef.current === requestedFen) {
            setEvaluation(ev);
          }
        } catch {
          if (evaluationFenRef.current === requestedFen) {
            setEvaluation(null);
          }
        }
      })();
    }, 250);
    return () => clearTimeout(timeoutId);
    // Omit isCalculating to avoid loop: getEvaluation sets it, so deps would retrigger effect
    // eslint-disable-next-line react-hooks/exhaustive-deps -- game.fen, game.status, isStockfishReady
  }, [game?.fen, game?.status, isStockfishReady]);

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

  // Auto-trigger engine move when it's engine's turn. If user offered a draw, clear it first (engine "declines").
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
      const fenAtStart = game.fen;
      const gameIdAtStart = game.id;
      const difficultyAtStart = game.difficulty;

      calculationFenRef.current = fenAtStart;

      const timeout = setTimeout(() => {
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

  // All hooks must run before any early return (Rules of Hooks)
  const boardOrientation: "white" | "black" =
    initialBoardOrientation ?? "white";

  const sortedMoves = useMemo(() => {
    const copy = [...moves];
    // eslint-disable-next-line unicorn/no-array-sort -- copy only; toSorted not in TS lib
    copy.sort((moveA, moveB) => moveA.moveNumber - moveB.moveNumber);
    return copy;
  }, [moves]);

  const viewingFen = useMemo(() => {
    const fen = game?.fen ?? "";
    if (replayIndex === sortedMoves.length) {
      return fen;
    }
    if (replayIndex === 0) {
      return sortedMoves[0]?.fenBefore ?? fen;
    }
    const move = sortedMoves[replayIndex - 1];
    return move?.fenAfter ?? fen;
  }, [game?.fen, replayIndex, sortedMoves]);

  const isViewingLive = replayIndex === sortedMoves.length;

  const moveHistory = useMemo(() => {
    return sortedMoves.map((move) => {
      const movePairNumber = Math.ceil(move.moveNumber / 2);
      const isWhiteMove = move.moveNumber % 2 === 1;
      return {
        ...move,
        displayNumber: isWhiteMove ? movePairNumber : undefined,
        isWhiteMove,
      };
    });
  }, [sortedMoves]);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AlertDialog
        open={isGameOver && !gameOverDismissed}
        onOpenChange={(open) => {
          if (!open) {
            setGameOverDismissed(true);
          }
        }}
      >
        <AlertDialogContent size="default" className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Game Over</AlertDialogTitle>
            <AlertDialogDescription>{gameOverMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push("/game/new")}>
              New Game
            </AlertDialogAction>
            <AlertDialogAction onClick={() => router.push("/games")}>
              View History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  {!isViewingLive && (
                    <p className="text-xs text-muted-foreground">
                      Viewing past position — use controls below to return to
                      live
                    </p>
                  )}
                  <div className="flex items-stretch gap-4">
                    <GameChessboard
                      position={viewingFen}
                      orientation={boardOrientation}
                      draggable={
                        isViewingLive &&
                        game.status === "in_progress" &&
                        !isEngineTurn &&
                        !isCalculating &&
                        !makeMove.isPending
                      }
                      status={game.status}
                      gameId={game.id}
                      onMoveSuccess={undefined}
                      customSquareStyles={customSquareStyles}
                    />
                    {game.status === "in_progress" && isStockfishReady && (
                      <EvaluationBar
                        evaluation={evaluation}
                        orientation={boardOrientation}
                      />
                    )}
                  </div>
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
                    disabled={isResigning}
                    onClick={async () => {
                      if (
                        !globalThis.confirm(
                          "Are you sure you want to resign? This will end the game."
                        )
                      ) {
                        return;
                      }
                      setIsResigning(true);
                      try {
                        await resignMutation({
                          gameId: toGameId(gameId),
                        });
                      } catch (error) {
                        console.error("Resign error:", error);
                        setIsResigning(false);
                      }
                    }}
                  >
                    {isResigning ? "Resigning…" : "Resign"}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
                <CardDescription>
                  {sortedMoves.length === 0
                    ? "No moves yet"
                    : `${sortedMoves.length} move${sortedMoves.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedMoves.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={replayIndex === 0}
                      onClick={() => setReplayIndex(0)}
                    >
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={replayIndex === 0}
                      onClick={() =>
                        setReplayIndex((prev) => Math.max(0, prev - 1))
                      }
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={replayIndex === sortedMoves.length}
                      onClick={() =>
                        setReplayIndex((prev) =>
                          Math.min(sortedMoves.length, prev + 1)
                        )
                      }
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={replayIndex === sortedMoves.length}
                      onClick={() => setReplayIndex(sortedMoves.length)}
                    >
                      End
                    </Button>
                  </div>
                )}
                {sortedMoves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Move history will appear here as you play
                  </p>
                ) : (
                  <div className="max-h-96 space-y-1 overflow-y-auto">
                    {moveHistory.map((move, idx) => {
                      const isCurrent =
                        replayIndex > 0 && replayIndex === idx + 1;
                      const isLive =
                        replayIndex === sortedMoves.length &&
                        idx === moveHistory.length - 1;
                      const highlighted = isCurrent || isLive;
                      return (
                        <button
                          key={move.id}
                          type="button"
                          className={`flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted ${
                            highlighted
                              ? "bg-primary/10 ring-1 ring-primary/30"
                              : ""
                          }`}
                          onClick={() => setReplayIndex(idx + 1)}
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
                          {isLive && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              (live)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PGN */}
            <Card>
              <CardHeader>
                <CardTitle>PGN</CardTitle>
                <CardDescription>Portable Game Notation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <pre className="max-h-48 overflow-auto rounded border bg-muted/50 p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                  {game.pgn ?? "No moves yet"}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(game.pgn ?? "");
                      setPgnCopied(true);
                      setTimeout(() => setPgnCopied(false), 2000);
                    } catch {
                      // Ignore clipboard errors
                    }
                  }}
                >
                  {pgnCopied ? "Copied" : "Copy PGN"}
                </Button>
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
