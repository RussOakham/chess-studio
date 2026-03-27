"use client";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { GameChessboard } from "@/components/chess/game-chessboard";
import {
  GameBoardArea,
  GameBoardColumn,
  GameBoardSquare,
  GameLayoutMain,
  GameLayoutRoot,
  GameSidebarColumn,
} from "@/components/game/game-layout";
import { MoveHistoryCard } from "@/components/game/move-history-card";
import { PlayerStrip } from "@/components/game/player-strip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { getSanForMove } from "@/lib/chess-notation";
import { toGameId } from "@/lib/convex-id";
import { game as gameCopy, loading } from "@/lib/copy";
import {
  getGameOverMessage,
  getKingInCheckSquareStyles,
} from "@/lib/game-status";
import { getTurnStatusLabel } from "@/lib/game-turn-status";
import { useBoardContainerSize } from "@/lib/hooks/use-board-container-size";
import { useEngineMoveEffect } from "@/lib/hooks/use-engine-move-effect";
import { useEngineTurn } from "@/lib/hooks/use-engine-turn";
import { useEvaluationSync } from "@/lib/hooks/use-evaluation-sync";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useHint } from "@/lib/hooks/use-hint";
import { useMakeMove } from "@/lib/hooks/use-make-move";
import { useReplay } from "@/lib/hooks/use-replay";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { getOpeningLabelFromPgn } from "@repo/chess";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { Bot, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
  /** Display name for the human player (e.g. email until usernames exist). */
  userDisplayName?: string;
}

interface GamePageContentProps extends GamePageClientProps {
  /**
   * Tracks last known `game.status` across Convex reconnect remounts so we only
   * show the completion modal on a live `in_progress` → `completed` transition,
   * not when opening an already-finished game from history.
   */
  lastGameStatusRef: RefObject<string | undefined>;
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
  let label: string = gameCopy.turn.unknown;
  if (makeMove.isError) {
    dotClass = "bg-red-500";
    label = gameCopy.turn.error;
  } else if (isEngineActive) {
    dotClass = "bg-yellow-500";
    label = gameCopy.turn.engineThinking;
  } else if (currentTurn === "white") {
    dotClass = "bg-white ring-1 ring-border";
    label = gameCopy.colors.white;
  } else if (currentTurn === "black") {
    dotClass = "bg-neutral-800 ring-1 ring-border dark:bg-neutral-600";
    label = gameCopy.colors.black;
  }

  return (
    <div className="flex h-5 items-center gap-2">
      <span className="font-medium text-foreground">
        {gameCopy.turn.prefix}
      </span>
      <div
        className={`h-3 w-3 shrink-0 rounded-full ${dotClass}`}
        aria-label={getTurnStatusLabel(params)}
      />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function GameInfoTurnOrResult({
  game,
  makeMove,
  isEngineTurn,
  isCalculating,
  currentTurn,
}: {
  game: Doc<"games">;
  makeMove: { isError: boolean; isPending: boolean };
  isEngineTurn: boolean;
  isCalculating: boolean;
  currentTurn: string | null;
}) {
  if (game.status === "in_progress") {
    return (
      <TurnStatusIndicator
        makeMove={makeMove}
        isEngineTurn={isEngineTurn}
        isCalculating={isCalculating}
        currentTurn={currentTurn}
      />
    );
  }
  if (game.result) {
    return (
      <>
        <span className="font-medium text-foreground">
          {gameCopy.result.prefix}
        </span>{" "}
        <span className="capitalize">{game.result.replaceAll("_", " ")}</span>
      </>
    );
  }
  return "—";
}

/**
 * Inner game content. Mounted with a key when Convex reconnects so useQuery
 * re-subscribes and receives the latest game state (avoids stale UI after
 * WebSocket disconnect/reconnect, e.g. from HMR).
 */
function GamePageContent({
  gameId,
  initialBoardOrientation,
  userDisplayName = gameCopy.defaultUserDisplayName,
  lastGameStatusRef,
}: GamePageContentProps) {
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
  /** True only after a live `in_progress` → `completed` transition this session. */
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [pgnCopied, setPgnCopied] = useState(false);

  useEffect(() => {
    setCompletionModalOpen(false);
    setGameOverDismissed(false);
    setResignDialogOpen(false);
  }, [gameId]);

  const handleConfirmResign = useCallback(async () => {
    setIsResigning(true);
    try {
      await resignMutation({
        gameId: toGameId(gameId),
      });
      setResignDialogOpen(false);
    } catch (error) {
      console.error("Resign error:", error);
    } finally {
      setIsResigning(false);
    }
  }, [gameId, resignMutation]);

  useEffect(() => {
    if (!game) {
      return;
    }
    const prev = lastGameStatusRef.current;
    if (prev === undefined) {
      lastGameStatusRef.current = game.status;
      return;
    }
    if (prev === "in_progress" && game.status === "completed") {
      setCompletionModalOpen(true);
    }
    lastGameStatusRef.current = game.status;
  }, [game, lastGameStatusRef]);

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
  const showGameCompletionModal =
    completionModalOpen && !gameOverDismissed && isGameOver;

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
    () => getCapturedPieces(sortedMoves.slice(0, replayIndex)),
    [sortedMoves, replayIndex]
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
  const boardSize = useBoardContainerSize(boardContainerRef);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PageLoading className="flex-1 justify-center" message={loading.game} />
      </div>
    );
  }

  const opponentLabel = gameCopy.opponent(game.difficulty);
  const reviewUrl = `/game/${gameId}/review`;

  // Player color (stored game.color is always "white" | "black" after creation)
  const playerColor = game.color === "random" ? "white" : game.color;
  const playerColorLabel =
    playerColor === "white" ? gameCopy.colors.white : gameCopy.colors.black;
  const opponentColorLabel =
    playerColor === "white" ? gameCopy.colors.black : gameCopy.colors.white;

  const openingLabel = getOpeningLabelFromPgn(game.pgn ?? undefined);

  return (
    <GameLayoutRoot gameSurface>
      <AlertDialog
        open={showGameCompletionModal}
        onOpenChange={(open) => {
          if (!open) {
            setGameOverDismissed(true);
          }
        }}
      >
        <AlertDialogContent size="default" className="max-w-sm">
          <div className="flex flex-col gap-3">
            <AlertDialogHeader className="flex flex-col gap-1 p-0 text-left sm:text-left">
              <div className="flex w-full items-center gap-2">
                <AlertDialogTitle className="flex-1 leading-tight">
                  {gameCopy.completionModal.title}
                </AlertDialogTitle>
                <AlertDialogClose className="static shrink-0" />
              </div>
              <AlertDialogDescription>{gameOverMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
              <AlertDialogAction
                onClick={() => {
                  router.push(reviewUrl);
                }}
              >
                {gameCopy.completionModal.reviewGame}
              </AlertDialogAction>
              <AlertDialogAction
                variant="outline"
                onClick={() => {
                  router.push("/");
                }}
              >
                {gameCopy.completionModal.backToDashboard}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resignDialogOpen}
        onOpenChange={(open) => {
          if (!open && isResigning) {
            return;
          }
          setResignDialogOpen(open);
        }}
      >
        <AlertDialogContent size="default" className="max-w-sm">
          <div className="flex flex-col gap-3">
            <AlertDialogHeader className="flex flex-col gap-1 p-0 text-left sm:text-left">
              <div className="flex w-full items-center gap-2">
                <AlertDialogTitle className="flex-1 leading-tight">
                  {gameCopy.resign.title}
                </AlertDialogTitle>
                <AlertDialogClose
                  className="static shrink-0"
                  disabled={isResigning}
                />
              </div>
              <AlertDialogDescription>
                {gameCopy.resign.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel disabled={isResigning}>
                {gameCopy.resign.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={isResigning}
                onClick={() => {
                  void handleConfirmResign();
                }}
              >
                {isResigning
                  ? gameCopy.resign.pending
                  : gameCopy.resign.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <GameLayoutMain variant="dense">
        {/* Center: board column (grows to fill height; board scales to fit) */}
        <GameBoardColumn>
          <PlayerStrip
            icon={Bot}
            name={opponentLabel}
            colorLabel={opponentColorLabel}
            capturedSymbols={capturedToSymbols(
              playerColor === "white"
                ? capturedPieces.black
                : capturedPieces.white
            )}
            badges={
              game.status === "in_progress" ? (
                <>
                  {isInCheck && (
                    <Badge variant="destructive" className="shrink-0">
                      {gameCopy.badges.check}
                    </Badge>
                  )}
                  {isCheckmate && (
                    <Badge variant="destructive" className="shrink-0">
                      {gameCopy.badges.checkmate}
                    </Badge>
                  )}
                  {isStalemate && (
                    <Badge variant="secondary" className="shrink-0">
                      {gameCopy.badges.stalemate}
                    </Badge>
                  )}
                  {isDraw && (
                    <Badge variant="secondary" className="shrink-0">
                      {gameCopy.badges.draw}
                    </Badge>
                  )}
                </>
              ) : undefined
            }
          />
          <GameBoardArea>
            <GameBoardSquare ref={boardContainerRef}>
              <div className="relative flex min-w-0 items-stretch gap-4">
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
            </GameBoardSquare>
            {!isViewingLive && (
              <p className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                {gameCopy.replay.viewingPastPosition}
              </p>
            )}
          </GameBoardArea>
          <PlayerStrip
            icon={User}
            name={userDisplayName}
            colorLabel={playerColorLabel}
            capturedSymbols={capturedToSymbols(
              playerColor === "white"
                ? capturedPieces.white
                : capturedPieces.black
            )}
          />
        </GameBoardColumn>

        {/* Right panel: scrollable content + controls at bottom */}
        <GameSidebarColumn variant="dense">
          {/* Game Info: 2x2 grid (shrink-0 so Move History can grow) */}
          <Card className="shrink-0">
            <CardHeader className="py-3">
              <CardTitle className="text-base">
                {gameCopy.info.cardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {gameCopy.info.status}
                  </span>{" "}
                  <span className="capitalize">
                    {game.status.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <GameInfoTurnOrResult
                    game={game}
                    makeMove={makeMove}
                    isEngineTurn={isEngineTurn}
                    isCalculating={isCalculating}
                    currentTurn={currentTurn}
                  />
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {gameCopy.info.created}
                  </span>{" "}
                  {new Date(game.createdAt).toLocaleDateString()}
                </div>
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {gameCopy.info.updated}
                  </span>{" "}
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
            evaluationSeries={review?.evaluations ?? undefined}
          />

          {/* Post-game: Match view (bot message, stats, CTAs) */}
          {game.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle>{gameCopy.postGame.playBotsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bot message */}
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                    ♔
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-muted/50 px-3 py-2 text-sm text-foreground">
                    {gameCopy.postGame.botMessage}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {openingLabel
                    ? gameCopy.postGame.openingPrefix(openingLabel)
                    : gameCopy.postGame.completeReviewAvailable}
                </p>
                {/* Summary stats from moveAnnotations */}
                {review?.moveAnnotations &&
                  review.moveAnnotations.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {(() => {
                        const good = review.moveAnnotations.filter(
                          (ann) => ann.type === "good"
                        ).length;
                        const best = review.moveAnnotations.filter(
                          (ann) => ann.type === "best"
                        ).length;
                        const inaccuracy = review.moveAnnotations.filter(
                          (ann) => ann.type === "inaccuracy"
                        ).length;
                        return (
                          <>
                            {good > 0 && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="text-primary">!</span>
                                {gameCopy.postGame.statGood(good)}
                              </span>
                            )}
                            {best > 0 && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="text-primary">★</span>
                                {gameCopy.postGame.statBest(best)}
                              </span>
                            )}
                            {inaccuracy > 0 && (
                              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <span className="text-orange-600 dark:text-orange-400">
                                  ?!
                                </span>
                                {gameCopy.postGame.statInaccuracy(inaccuracy)}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                {isAnalyzing && (
                  <p className="text-sm text-muted-foreground">
                    {gameCopy.postGame.analyzing}
                    {progress &&
                      gameCopy.postGame.analyzingProgress(
                        progress.completed,
                        progress.total
                      )}
                  </p>
                )}
                {/* Primary CTA: Game Review (new tab) */}
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${buttonVariants({ size: "lg" })} inline-flex w-full`}
                  aria-label={gameCopy.postGame.reviewNewTabAria}
                >
                  {gameCopy.postGame.reviewCta}
                </a>
                {/* Secondary: New Game, Rematch */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/game/new")}
                  >
                    {gameCopy.postGame.newGame}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/game/new")}
                  >
                    {gameCopy.postGame.rematch}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PGN: accordion */}
          <details className="group rounded-lg border border-border bg-card">
            <summary className="cursor-pointer list-none px-4 py-3 font-medium">
              {gameCopy.pgn.summaryTitle}
            </summary>
            <div className="border-t border-border px-4 pt-2 pb-4">
              <pre className="max-h-48 overflow-auto rounded border bg-muted/50 p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {game.pgn ?? gameCopy.pgn.noMovesYet}
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
                {pgnCopied ? gameCopy.pgn.copied : gameCopy.pgn.copy}
              </Button>
            </div>
          </details>

          {/* Game Controls: full-width, prominent, side by side */}
          {game.status === "in_progress" && (
            <div className="mt-auto shrink-0 border-t border-border pt-4">
              <div className="grid w-full grid-cols-2 gap-2">
                {isStockfishReady && (
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
                    {isHintLoading
                      ? gameCopy.controls.hintThinking
                      : gameCopy.controls.hint}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="lg"
                  className="w-full"
                  disabled={isResigning}
                  onClick={() => {
                    setResignDialogOpen(true);
                  }}
                >
                  {gameCopy.resign.button}
                </Button>
              </div>
              {hint && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {hintSan
                    ? gameCopy.controls.hintLine(hintSan)
                    : gameCopy.controls.hintAvailable}
                </p>
              )}
            </div>
          )}
        </GameSidebarColumn>
      </GameLayoutMain>
    </GameLayoutRoot>
  );
}

/** When Convex WebSocket reconnects, remount game content so subscriptions get latest state. */
export function GamePageClient(props: GamePageClientProps) {
  const connectionState = useConvexConnectionState();
  const wasDisconnectedRef = useRef(false);
  const [connectionRefreshKey, setConnectionRefreshKey] = useState(0);
  const lastGameStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    lastGameStatusRef.current = undefined;
  }, [props.gameId]);

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
      lastGameStatusRef={lastGameStatusRef}
    />
  );
}
