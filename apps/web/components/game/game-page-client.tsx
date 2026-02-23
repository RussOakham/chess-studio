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
  getStatusDescription,
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
import Link from "next/link";
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
  const {
    runAnalysis,
    isAnalyzing,
    progress,
    error: analysisError,
  } = useGameAnalysis({
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
                {game.status === "in_progress" && (
                  <TurnStatusIndicator
                    makeMove={makeMove}
                    isEngineTurn={isEngineTurn}
                    isCalculating={isCalculating}
                  />
                )}
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

            {/* Post-game analysis */}
            {game.status === "completed" && (
              <Card>
                <CardHeader>
                  <CardTitle>Game Analysis</CardTitle>
                  <CardDescription>
                    Engine review: mistakes, blunders, and suggestions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {review === undefined && (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  )}
                  {review === null && (
                    <>
                      {analysisError && (
                        <p className="text-sm text-destructive">
                          {analysisError}
                        </p>
                      )}
                      {isAnalyzing && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Analyzing…
                            {progress &&
                              ` Move ${progress.completed} of ${progress.total}`}
                          </p>
                        </div>
                      )}
                      {!isAnalyzing && (
                        <Button
                          className="w-full"
                          disabled={!isStockfishReady || moves.length === 0}
                          onClick={() => void runAnalysis()}
                        >
                          Analyze game
                        </Button>
                      )}
                    </>
                  )}
                  {review !== undefined && review !== null && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Summary</p>
                        <p className="text-sm text-muted-foreground">
                          {review.summary}
                        </p>
                      </div>
                      {review.keyMoments && review.keyMoments.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Key moments</p>
                          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {review.keyMoments.map((moment, index) => (
                              <li key={`${moment}-${index}`}>{moment}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {review.suggestions && review.suggestions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium">Suggestions</p>
                          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {review.suggestions.map((suggestion, index) => (
                              <li key={`${suggestion}-${index}`}>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
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
