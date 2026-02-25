"use client";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { GameChessboard } from "@/components/chess/game-chessboard";
import { MoveHistoryCard } from "@/components/game/move-history-card";
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
import { getSanForMove } from "@/lib/chess-notation";
import { toGameId } from "@/lib/convex-id";
import {
  getGameOverMessage,
  getKingInCheckSquareStyles,
} from "@/lib/game-status";
import {
  getTurnStatusColor,
  getTurnStatusLabel,
  getTurnStatusText,
} from "@/lib/game-turn-status";
import { useEngineMoveEffect } from "@/lib/hooks/use-engine-move-effect";
import { useEngineTurn } from "@/lib/hooks/use-engine-turn";
import { useEvaluationSync } from "@/lib/hooks/use-evaluation-sync";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useHint } from "@/lib/hooks/use-hint";
import { useMakeMove } from "@/lib/hooks/use-make-move";
import { useReplay } from "@/lib/hooks/use-replay";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
}

/** Status dot and label for turn/engine state. */
function TurnStatusIndicator({
  makeMove,
  isEngineTurn,
  isCalculating,
}: {
  makeMove: { isError: boolean; isPending: boolean };
  isEngineTurn: boolean;
  isCalculating: boolean;
}) {
  const params = {
    isMoveError: makeMove.isError,
    isEngineTurn,
    isCalculating,
    isMovePending: makeMove.isPending,
  };
  return (
    <div className="absolute top-4 right-4 flex h-5 items-center gap-2">
      <div
        className={`h-3 w-3 shrink-0 rounded-full ${getTurnStatusColor(params)}`}
        aria-label={getTurnStatusLabel(params)}
      />
      <span className="text-xs whitespace-nowrap text-muted-foreground">
        {getTurnStatusText(params)}
      </span>
    </div>
  );
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

  const resignMutation = useMutation(api.games.resign);
  const router = useRouter();
  const [isResigning, setIsResigning] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [pgnCopied, setPgnCopied] = useState(false);

  const review = useQuery(
    api.reviews.getByGameId,
    game ? { gameId: game._id } : "skip"
  );
  const { isAnalyzing, progress } = useGameAnalysis({
    gameId,
    game: game ?? undefined,
    moves: moves ?? [],
    getEvaluation,
    getBestMove,
  });

  const { makeMove, justSubmittedEngineMoveRef } = useMakeMove(gameId);
  const { isEngineGame, isEngineTurn } = useEngineTurn(game, chess);
  const evaluation = useEvaluationSync(
    game?.fen,
    game?.status,
    isStockfishReady,
    getEvaluation
  );

  const makeMoveMutate = useCallback(
    async (variables: { from: string; to: string; promotion?: string }) => {
      await makeMove.mutate({
        from: variables.from,
        to: variables.to,
        promotion: variables.promotion,
      });
    },
    // Intentionally depend only on makeMove.mutate to keep callback stable and avoid useEngineMoveEffect re-firing every render
    // eslint-disable-next-line react-hooks/exhaustive-deps -- makeMove object is new each render; .mutate is stable
    [makeMove.mutate]
  );

  useEngineMoveEffect({
    isEngineGame,
    isEngineTurn,
    gameStatus: game?.status,
    gameFen: game?.fen,
    gameId: game?.id,
    gameDifficulty: game?.difficulty,
    gameIdParam: gameId,
    isGameFetching,
    isStockfishReady,
    isCalculating,
    makeMoveIsPending: makeMove.isPending,
    isCheckmate,
    isStalemate,
    isDraw,
    getBestMove,
    makeMoveMutate,
    justSubmittedRef: justSubmittedEngineMoveRef,
  });

  const isGameOver = game?.status === "completed";
  const gameOverMessage = getGameOverMessage(game?.result);

  // All hooks must run before any early return (Rules of Hooks)
  const boardOrientation: "white" | "black" =
    initialBoardOrientation ?? "white";

  const {
    replayIndex,
    setReplayIndex,
    sortedMoves,
    viewingFen,
    isViewingLive,
    moveHistory,
  } = useReplay(moves, game?.fen);

  const hintEnabled =
    game?.status === "in_progress" &&
    !isEngineTurn &&
    isViewingLive &&
    isStockfishReady;
  const { hint, requestHint, isHintLoading } = useHint({
    fen: viewingFen,
    difficulty: game?.difficulty,
    getBestMove,
    enabled: Boolean(hintEnabled),
  });

  const customSquareStyles = useMemo(
    () => getKingInCheckSquareStyles(chess),
    [chess]
  );

  const customArrows = useMemo(
    (): [string, string, string][] =>
      hint ? [[hint.from, hint.to, "rgb(34, 197, 94)"]] : [],
    [hint]
  );

  const hintSan =
    hint && getSanForMove(viewingFen, hint.from, hint.to, hint.promotion);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  const opponentLabel = `Engine (${game.difficulty})`;
  const reviewUrl = `/game/${gameId}/review`;

  return (
    <div className="min-h-full bg-background">
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

      <main className="flex flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Center: board with player strips */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-muted-foreground">
              {opponentLabel}
            </span>
            {game.status === "in_progress" && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground capitalize">
                  {currentTurn}
                </span>
                {isInCheck && <Badge variant="destructive">Check</Badge>}
                {isCheckmate && <Badge variant="destructive">Checkmate</Badge>}
                {isStalemate && <Badge variant="secondary">Stalemate</Badge>}
                {isDraw && <Badge variant="secondary">Draw</Badge>}
              </>
            )}
          </div>
          <div className="relative flex flex-col items-center gap-2">
            {!isViewingLive && (
              <p className="text-xs text-muted-foreground">
                Viewing past position — use controls to return to live
              </p>
            )}
            {game.status === "in_progress" && (
              <div className="absolute top-2 right-2">
                <TurnStatusIndicator
                  makeMove={makeMove}
                  isEngineTurn={isEngineTurn}
                  isCalculating={isCalculating}
                />
              </div>
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
                customArrows={customArrows}
              />
              {game.status === "in_progress" && isStockfishReady && (
                <EvaluationBar
                  evaluation={evaluation}
                  orientation={boardOrientation}
                />
              )}
            </div>
          </div>
          <div className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium text-muted-foreground">You</span>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-md">
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
              {game.status === "in_progress" && isStockfishReady && (
                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={
                    isEngineTurn ||
                    !isViewingLive ||
                    isCalculating ||
                    isHintLoading ||
                    !game?.difficulty
                  }
                  onClick={() => void requestHint()}
                >
                  {isHintLoading ? "Thinking…" : "Get Hint"}
                </Button>
              )}
              {game.status === "in_progress" && hint && (
                <p className="text-sm text-muted-foreground">
                  {hintSan ? `Hint: ${hintSan}` : "Hint available"}
                </p>
              )}
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
          <MoveHistoryCard
            sortedMovesLength={sortedMoves.length}
            replayIndex={replayIndex}
            setReplayIndex={setReplayIndex}
            moveHistory={moveHistory}
            moveAnnotations={review?.moveAnnotations}
          />

          {/* Post-game: Match view (bot message, stats, CTAs) */}
          {game.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle>Play Bots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bot message */}
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                    ♔
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-muted/50 px-3 py-2 text-sm text-foreground">
                    Great game! Open Game Review to see how you did.
                  </div>
                </div>
                {/* Opening placeholder */}
                <p className="text-xs text-muted-foreground">
                  Game complete · Review available below
                </p>
                {/* Summary stats from moveAnnotations */}
                {review?.moveAnnotations &&
                  review.moveAnnotations.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const great = review.moveAnnotations.filter(
                          (a) => a.type === "good"
                        ).length;
                        const best = review.moveAnnotations.filter(
                          (a) => a.type === "best"
                        ).length;
                        return (
                          <>
                            {great > 0 && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="text-primary">!</span>
                                {great} Great
                              </span>
                            )}
                            {best > 0 && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="text-primary">★</span>
                                {best} Best
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                {isAnalyzing && (
                  <p className="text-sm text-muted-foreground">
                    Analyzing…
                    {progress &&
                      ` Move ${progress.completed} of ${progress.total}`}
                  </p>
                )}
                {/* Primary CTA: Game Review (new tab) */}
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block w-full"
                  aria-label="Open Game Review in new tab"
                >
                  <Button className="w-full" size="lg">
                    Game Review
                  </Button>
                </a>
                {/* Secondary: New Game, Rematch */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/game/new")}
                  >
                    + New Game
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/game/new")}
                  >
                    Rematch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
