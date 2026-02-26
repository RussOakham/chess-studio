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
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { getSanForMove } from "@/lib/chess-notation";
import { toGameId } from "@/lib/convex-id";
import {
  getGameOverMessage,
  getKingInCheckSquareStyles,
} from "@/lib/game-status";
import { getTurnStatusLabel } from "@/lib/game-turn-status";
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
import { Bot, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
  /** Display name for the human player (e.g. email until usernames exist). */
  userDisplayName?: string;
}

/**
 * Turn cell for Game Info grid: "Turn:" + traffic light (white / yellow / black dot) + label.
 * States: White (white dot), Engine thinking (yellow), Black (black dot). Error keeps red.
 */
function TurnStatusIndicator({
  makeMove,
  isEngineTurn,
  isCalculating,
  currentTurn,
}: {
  makeMove: { isError: boolean; isPending: boolean };
  isEngineTurn: boolean;
  isCalculating: boolean;
  currentTurn: string | null;
}) {
  const isEngineActive = isEngineTurn || isCalculating || makeMove.isPending;
  const params = {
    isMoveError: makeMove.isError,
    isEngineTurn,
    isCalculating,
    isMovePending: makeMove.isPending,
  };

  let dotClass = "bg-neutral-800 ring-1 ring-border dark:bg-neutral-600";
  let label = "Black";
  if (makeMove.isError) {
    dotClass = "bg-red-500";
    label = "Error";
  } else if (isEngineActive) {
    dotClass = "bg-yellow-500";
    label = "Engine thinking";
  } else if (currentTurn === "white") {
    dotClass = "bg-white ring-1 ring-border";
    label = "White";
  }

  return (
    <div className="flex h-5 items-center gap-2">
      <span className="font-medium text-foreground">Turn:</span>
      <div
        className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`}
        aria-label={getTurnStatusLabel(params)}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
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
  userDisplayName = "You",
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

  const capturedPieces = useMemo(
    () => getCapturedPieces(moves.slice(0, replayIndex)),
    [moves, replayIndex]
  );

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

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(560);
  useLayoutEffect(() => {
    const el = boardContainerRef.current;
    if (!el) {
      return;
    }
    function updateSize() {
      if (!el) {
        return;
      }
      const w = el.clientWidth;
      const h = el.clientHeight;
      const side = Math.min(w, h);
      setBoardSize(Math.max(200, side - 32));
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  const opponentLabel = `Engine (${game.difficulty})`;
  const reviewUrl = `/game/${gameId}/review`;

  // Player color (stored game.color is always "white" | "black" after creation)
  const playerColor = game.color === "random" ? "white" : game.color;
  const playerColorLabel = playerColor === "white" ? "White" : "Black";
  const opponentColorLabel = playerColor === "white" ? "Black" : "White";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
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

      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Center: board column (grows to fill height; board scales to fit) */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-full">
          <div className="flex w-full shrink-0 flex-row gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
            <div
              className="flex min-w-10 shrink-0 items-center justify-center self-stretch rounded-md bg-muted text-muted-foreground"
              aria-hidden
            >
              <Bot className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {opponentLabel}
                </span>
                <span className="text-sm text-muted-foreground">
                  {opponentColorLabel}
                </span>
                {game.status === "in_progress" && (
                  <>
                    {isInCheck && (
                      <Badge variant="destructive" className="shrink-0">
                        Check
                      </Badge>
                    )}
                    {isCheckmate && (
                      <Badge variant="destructive" className="shrink-0">
                        Checkmate
                      </Badge>
                    )}
                    {isStalemate && (
                      <Badge variant="secondary" className="shrink-0">
                        Stalemate
                      </Badge>
                    )}
                    {isDraw && (
                      <Badge variant="secondary" className="shrink-0">
                        Draw
                      </Badge>
                    )}
                  </>
                )}
              </div>
              {(() => {
                const opponentCaptured =
                  playerColor === "white"
                    ? capturedPieces.black
                    : capturedPieces.white;
                const symbols = capturedToSymbols(opponentCaptured);
                if (symbols.length === 0) return null;
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5 leading-none"
                    aria-label={`Captured: ${symbols.join(" ")}`}
                  >
                    {symbols.map((sym, idx) => (
                      <span
                        key={`${idx}-${sym}`}
                        className="inline-flex min-w-[1.25rem] items-center justify-center text-2xl"
                        style={{ fontSize: "1.5rem" }}
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div
              ref={boardContainerRef}
              className="flex aspect-square h-full max-w-full items-center justify-center"
            >
              <div className="relative flex items-stretch gap-4">
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
                  boardWidth={boardSize}
                />
                {game.status === "in_progress" && isStockfishReady && (
                  <EvaluationBar
                    evaluation={evaluation}
                    orientation={boardOrientation}
                  />
                )}
              </div>
            </div>
            {!isViewingLive && (
              <p className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                Viewing past position — use controls to return to live
              </p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-row gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
            <div
              className="flex min-w-10 shrink-0 items-center justify-center self-stretch rounded-md bg-muted text-muted-foreground"
              aria-hidden
            >
              <User className="size-5" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">
                  {userDisplayName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {playerColorLabel}
                </span>
              </div>
              {(() => {
                const playerCaptured =
                  playerColor === "white"
                    ? capturedPieces.white
                    : capturedPieces.black;
                const symbols = capturedToSymbols(playerCaptured);
                if (symbols.length === 0) return null;
                return (
                  <div
                    className="flex flex-wrap items-center gap-1.5 leading-none"
                    aria-label={`Captured: ${symbols.join(" ")}`}
                  >
                    {symbols.map((sym, idx) => (
                      <span
                        key={`${idx}-${sym}`}
                        className="inline-flex min-w-[1.25rem] items-center justify-center text-2xl"
                        style={{ fontSize: "1.5rem" }}
                      >
                        {sym}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right panel: scrollable content + controls at bottom */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 lg:w-auto lg:max-w-md">
          {/* Game Info: 2x2 grid (shrink-0 so Move History can grow) */}
          <Card className="shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Game Info</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Status:</span>{" "}
                  <span className="capitalize">
                    {game.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  {game.status === "in_progress" ? (
                    <TurnStatusIndicator
                      makeMove={makeMove}
                      isEngineTurn={isEngineTurn}
                      isCalculating={isCalculating}
                      currentTurn={currentTurn}
                    />
                  ) : game.result ? (
                    <>
                      <span className="font-medium text-foreground">
                        Result:
                      </span>{" "}
                      <span className="capitalize">
                        {game.result.replaceAll("_", " ")}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Created:</span>{" "}
                  {new Date(game.createdAt).toLocaleDateString()}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Updated:</span>{" "}
                  {new Date(game.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Move History: grows to fill space */}
          <MoveHistoryCard
            className="flex min-h-0 flex-1 flex-col"
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
                  className={
                    buttonVariants({ size: "lg" }) + " inline-flex w-full"
                  }
                  aria-label="Open Game Review in new tab"
                >
                  Game Review
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

          {/* PGN: accordion */}
          <details className="group rounded-lg border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium">
              PGN (Portable Game Notation)
            </summary>
            <div className="border-t border-border px-4 pt-2 pb-4">
              <pre className="max-h-48 overflow-auto rounded border bg-muted/50 p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {game.pgn ?? "No moves yet"}
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
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
            </div>
          </details>

          {/* Game Controls: full-width, prominent, side by side */}
          <div className="mt-auto shrink-0 border-t border-border pt-4">
            <div className="grid w-full grid-cols-2 gap-2">
              {game.status === "in_progress" && isStockfishReady && (
                <Button
                  variant="secondary"
                  size="lg"
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
                  {isHintLoading ? "Thinking…" : "Hint"}
                </Button>
              )}
              {game.status === "in_progress" && (
                <Button
                  variant="destructive"
                  size="lg"
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
            </div>
            {game.status === "in_progress" && hint && (
              <p className="mt-2 text-xs text-muted-foreground">
                {hintSan ? `Hint: ${hintSan}` : "Hint available"}
              </p>
            )}
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
      userDisplayName={props.userDisplayName}
    />
  );
}
