"use client";

import { EngineLinesPanel } from "@/components/chess/engine-lines-panel";
import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { GameChessboard } from "@/components/chess/game-chessboard";
import { GameCompletionDialog } from "@/components/game/game-completion-dialog";
import { GameInfoTurnOrResult } from "@/components/game/game-info-turn-or-result";
import {
  GameBoardArea,
  GameBoardColumn,
  GameBoardSquare,
  GameLayoutMain,
  GameLayoutRoot,
  GameSidebarColumn,
} from "@/components/game/game-layout";
import { GamePostGameCard } from "@/components/game/game-post-game-card";
import { GameResignDialog } from "@/components/game/game-resign-dialog";
import { MoveHistoryCard } from "@/components/game/move-history-card";
import { PlayerStrip } from "@/components/game/player-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { getSanForMove } from "@/lib/chess-notation";
import { toGameId } from "@/lib/convex-id";
import { game as gameCopy, loading } from "@/lib/copy";
import {
  getGameOverMessage,
  getKingInCheckSquareStyles,
} from "@/lib/game-status";
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
import { useMutation, useQuery } from "convex/react";
import { Bot, User } from "lucide-react";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LIVE_ENGINE_LINES_STORAGE_KEY = "chess-studio:live-engine-lines-enabled";

export interface GamePageContentProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
  /** Display name for the human player (e.g. email until usernames exist). */
  userDisplayName?: string;
  /**
   * Tracks last known `game.status` across Convex reconnect remounts so we only
   * show the completion modal on a live `in_progress` → `completed` transition,
   * not when opening an already-finished game from history.
   */
  lastGameStatusRef: RefObject<string | undefined>;
}

/**
 * Inner game content. Mounted with a key when Convex reconnects so useQuery
 * re-subscribes and receives the latest game state (avoids stale UI after
 * WebSocket disconnect/reconnect, e.g. from HMR).
 */
export function GamePageContent({
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

  const {
    isReady: isStockfishReady,
    isAnalysisEngineReady,
    isCalculating,
    getBestMove,
    getEvaluation,
    getEngineLines,
    abortEngineLines,
  } = useStockfish();

  const resignMutation = useMutation(api.games.resign);
  const router = useRouter();
  const [isResigning, setIsResigning] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [resignError, setResignError] = useState<string | null>(null);
  const [pgnCopied, setPgnCopied] = useState(false);
  const [liveEngineLinesEnabled, setLiveEngineLinesEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = globalThis.localStorage?.getItem(
        LIVE_ENGINE_LINES_STORAGE_KEY
      );
      setLiveEngineLinesEnabled(stored === "true");
    } catch {
      /* Ignore */
    }
  }, []);

  const persistLiveEngineLines = useCallback((enabled: boolean) => {
    setLiveEngineLinesEnabled(enabled);
    try {
      globalThis.localStorage?.setItem(
        LIVE_ENGINE_LINES_STORAGE_KEY,
        enabled ? "true" : "false"
      );
    } catch {
      /* Ignore */
    }
  }, []);

  useEffect(() => {
    setCompletionModalOpen(false);
    setGameOverDismissed(false);
    setResignDialogOpen(false);
    setResignError(null);
  }, [gameId]);

  const handleConfirmResign = useCallback(async () => {
    setResignError(null);
    setIsResigning(true);
    try {
      await resignMutation({
        gameId: toGameId(gameId),
      });
      setResignDialogOpen(false);
    } catch (error) {
      console.error("Resign error:", error);
      setResignError(gameCopy.resign.failed);
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

  const playerColor = game.color === "random" ? "white" : game.color;
  const playerColorLabel =
    playerColor === "white" ? gameCopy.colors.white : gameCopy.colors.black;
  const opponentColorLabel =
    playerColor === "white" ? gameCopy.colors.black : gameCopy.colors.white;

  const openingLabel = getOpeningLabelFromPgn(game.pgn ?? undefined);

  return (
    <GameLayoutRoot gameSurface>
      <GameCompletionDialog
        open={showGameCompletionModal}
        onOpenChange={(open) => {
          if (!open) {
            setGameOverDismissed(true);
          }
        }}
        gameOverMessage={gameOverMessage}
        onNavigateReview={() => {
          router.push(reviewUrl);
        }}
        onNavigateDashboard={() => {
          router.push("/");
        }}
      />

      <GameResignDialog
        open={resignDialogOpen}
        onOpenChange={(open) => {
          setResignDialogOpen(open);
          if (open) {
            setResignError(null);
          }
        }}
        isResigning={isResigning}
        resignError={resignError}
        onConfirmResign={handleConfirmResign}
      />

      <GameLayoutMain variant="dense">
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

        <GameSidebarColumn variant="dense">
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

          {game.status === "in_progress" ? (
            <EngineLinesPanel
              fen={viewingFen}
              isStockfishReady={isStockfishReady && isAnalysisEngineReady}
              blockAnalysis={isCalculating}
              getEngineLines={getEngineLines}
              abortEngineLines={abortEngineLines}
              variant="live"
              liveEnabled={liveEngineLinesEnabled}
              onLiveEnabledChange={persistLiveEngineLines}
            />
          ) : null}

          <MoveHistoryCard
            className="flex min-h-0 flex-1 flex-col"
            sortedMovesLength={sortedMoves.length}
            replayIndex={replayIndex}
            setReplayIndex={setReplayIndex}
            moveHistory={moveHistory}
            moveAnnotations={review?.moveAnnotations}
            evaluationSeries={review?.evaluations ?? undefined}
          />

          {game.status === "completed" && (
            <GamePostGameCard
              openingLabel={openingLabel}
              review={review}
              isAnalyzing={isAnalyzing}
              progress={progress}
              reviewUrl={reviewUrl}
              onNewGame={() => router.push("/game/new")}
            />
          )}

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
