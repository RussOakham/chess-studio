"use client";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { BoardArrow } from "@/components/chess/chessboard";
import { EngineLinesPanel } from "@/components/chess/engine-lines-panel";
import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { EvaluationSparkline } from "@/components/chess/evaluation-sparkline";
import { GameChessboard } from "@/components/chess/game-chessboard";
import { MoveAnnotationGlyph } from "@/components/chess/move-annotation-glyph";
import { ReviewMoveQualityBadge } from "@/components/chess/review-move-quality-badge";
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
  AnalysisProgressBar,
  CircularAnalysisProgress,
} from "@/components/review/review-analysis-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { shouldShowTimelineMarker } from "@/lib/annotation-chart-styles";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { game as gameCopy, review as reviewCopy } from "@/lib/copy";
import {
  formatBookMoveCaption,
  openingNameSuffix,
} from "@/lib/format-book-move-caption";
import { useBoardContainerSize } from "@/lib/hooks/use-board-container-size";
import { useEvaluationForFen } from "@/lib/hooks/use-evaluation-for-fen";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useReplay } from "@/lib/hooks/use-replay";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import {
  buildReviewBoardArrows,
  uciToFromTo,
} from "@/lib/review-board-overlays";
import { evaluationForReplayIndex } from "@/lib/review-evaluation";
import { getOpeningLabelFromPgn } from "@repo/chess";
import type {
  EngineLine,
  GameDifficulty,
  MoveAnnotation,
  MoveAnnotationType,
  PositionEvaluation,
} from "@repo/chess";
import { useAction, useQuery } from "convex/react";
import { Bot, Loader2, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EMPTY_GAME_MOVES: Doc<"moves">[] = [];

const EMPTY_REVIEW_BOARD_ARROWS: BoardArrow[] = [];

interface ReviewPageClientProps {
  gameId: string;
  userDisplayName: string;
}

function moveQualityCounts(
  moveAnnotations: { moveNumber: number; type: string }[] | undefined
) {
  if (!moveAnnotations?.length) {
    return {
      good: 0,
      best: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };
  }
  return {
    good: moveAnnotations.filter((ann) => ann.type === "good").length,
    best: moveAnnotations.filter((ann) => ann.type === "best").length,
    book: moveAnnotations.filter((ann) => ann.type === "book").length,
    inaccuracy: moveAnnotations.filter((ann) => ann.type === "inaccuracy")
      .length,
    mistake: moveAnnotations.filter((ann) => ann.type === "mistake").length,
    blunder: moveAnnotations.filter((ann) => ann.type === "blunder").length,
  };
}

function accuracyPercent(
  moveAnnotations: { type: string }[] | undefined
): number | null {
  if (!moveAnnotations?.length) {
    return null;
  }
  const goodOrBest = moveAnnotations.filter(
    (ann) => ann.type === "good" || ann.type === "best" || ann.type === "book"
  ).length;
  return Math.round((goodOrBest / moveAnnotations.length) * 1000) / 10;
}

/** Stored reviews may omit `evaluations` (older saves); re-analyze when missing or length ≠ ply count. */
function reviewNeedsEvaluationsRefresh(
  review: { evaluations?: number[] } | null | undefined,
  moveCount: number
): boolean {
  if (review === null || review === undefined || moveCount < 1) {
    return false;
  }
  const ev = review.evaluations;
  return !Array.isArray(ev) || ev.length !== moveCount;
}

function midReviewAnnotationCaption(annotation: {
  type: MoveAnnotationType;
  bestMoveSan?: string;
  bookOpeningEco?: string;
  bookOpeningName?: string;
}): string {
  const openingLine = openingNameSuffix(
    annotation.bookOpeningEco,
    annotation.bookOpeningName
  );
  switch (annotation.type) {
    case "best": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.bestWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.bestFallback) + openingLine
      );
    }
    case "good": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.goodWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.goodFallback) + openingLine
      );
    }
    case "inaccuracy": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.inaccuracyWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.inaccuracyFallback) + openingLine
      );
    }
    case "blunder": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.blunderWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.blunderFallback) + openingLine
      );
    }
    case "mistake": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.mistakeWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.mistakeFallback) + openingLine
      );
    }
    case "book": {
      return formatBookMoveCaption(
        annotation.bookOpeningEco,
        annotation.bookOpeningName
      );
    }
    default: {
      const exhaustive: never = annotation.type;
      return exhaustive;
    }
  }
}

interface ReviewMidReviewProps {
  gameId: string;
  userDisplayName: string;
  isStockfishReady: boolean;
  /** Second WASM worker for MultiPV; eval bar uses main worker only. */
  isAnalysisEngineReady: boolean;
  getEvaluation: (fen: string) => Promise<PositionEvaluation>;
  getEngineLines: (
    fen: string,
    opts?: { depth?: number; multipv?: number }
  ) => Promise<EngineLine[] | null>;
  abortEngineLines: () => void;
  game: {
    fen: string;
    _id: string;
    difficulty: GameDifficulty;
    color: "white" | "black" | "random";
  };
  moves: Doc<"moves">[];
  review: {
    summary: string;
    evaluations?: number[];
    keyMoments?: string[];
    moveAnnotations?: MoveAnnotation[];
  };
}

function ReviewMidReview({
  gameId,
  userDisplayName,
  isStockfishReady,
  isAnalysisEngineReady,
  getEvaluation,
  getEngineLines,
  abortEngineLines,
  game,
  moves,
  review,
}: ReviewMidReviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moveParam = searchParams.get("move");
  const urlIndex =
    moveParam !== null ? Math.max(0, parseInt(moveParam, 10) || 0) : null;

  const { replayIndex, setReplayIndex, sortedMoves, viewingFen, moveHistory } =
    useReplay(moves, game.fen);

  useEffect(() => {
    if (urlIndex === null) {
      return;
    }
    const clamped = Math.min(Math.max(0, urlIndex), moves.length);
    if (clamped !== replayIndex) {
      setReplayIndex(clamped);
    }
  }, [urlIndex, moves.length, replayIndex, setReplayIndex]);

  const setReplayIndexAndUrl = useCallback(
    (value: number | ((prev: number) => number)) => {
      const next = Math.max(
        0,
        Math.min(
          moves.length,
          typeof value === "function" ? value(replayIndex) : value
        )
      );
      setReplayIndex(next);
      router.replace(`/game/${gameId}/review?move=${next}`, { scroll: false });
    },
    [gameId, moves.length, replayIndex, router, setReplayIndex]
  );

  const currentMoveIndex = replayIndex > 0 ? replayIndex - 1 : null;
  const currentMove =
    currentMoveIndex !== null ? (sortedMoves[currentMoveIndex] ?? null) : null;
  const currentAnnotation =
    currentMove != null && review.moveAnnotations
      ? review.moveAnnotations.find(
          (ann) => ann.moveNumber === currentMove.moveNumber
        )
      : undefined;

  const canShowEngineLine = useMemo(() => {
    if (currentMove === null || currentAnnotation === undefined) {
      return false;
    }
    return (
      (currentAnnotation.bestMoveSan !== undefined &&
        currentAnnotation.bestMoveSan.length > 0) ||
      (currentAnnotation.bestMoveUci !== undefined &&
        currentAnnotation.bestMoveUci.length > 0)
    );
  }, [currentMove, currentAnnotation]);

  const overlayBuild = useMemo(() => {
    if (
      !canShowEngineLine ||
      currentMove === null ||
      currentAnnotation === undefined
    ) {
      return {
        arrows: [] as BoardArrow[],
        squareStyles: undefined,
        error: null as string | null,
      };
    }
    const move = currentMove;
    const annotation = currentAnnotation;
    return buildReviewBoardArrows({
      fenBefore: move.fenBefore,
      playedMoveUci: move.moveUci,
      annotation,
    });
  }, [canShowEngineLine, currentMove, currentAnnotation]);

  const boardFen = useMemo(() => {
    if (!canShowEngineLine || currentMove === null) {
      return viewingFen;
    }
    if (overlayBuild.error !== null) {
      return viewingFen;
    }
    return currentMove.fenBefore;
  }, [canShowEngineLine, currentMove, viewingFen, overlayBuild.error]);

  const boardArrows = useMemo((): BoardArrow[] => {
    if (overlayBuild.error !== null) {
      return EMPTY_REVIEW_BOARD_ARROWS;
    }
    return overlayBuild.arrows;
  }, [overlayBuild.error, overlayBuild.arrows]);

  const boardSquareStyles = useMemo(() => {
    if (overlayBuild.error !== null) {
      return undefined;
    }
    return overlayBuild.squareStyles;
  }, [overlayBuild.error, overlayBuild.squareStyles]);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardContainerSize(boardContainerRef);

  const playerColor = game.color === "random" ? "white" : game.color;
  const playerColorLabel =
    playerColor === "white" ? gameCopy.colors.white : gameCopy.colors.black;
  const opponentColorLabel =
    playerColor === "white" ? gameCopy.colors.black : gameCopy.colors.white;
  const boardOrientation: "white" | "black" =
    playerColor === "black" ? "black" : "white";
  const opponentLabel = gameCopy.opponent(game.difficulty);

  const badgeDestinationSquare = useMemo(() => {
    if (
      replayIndex < 1 ||
      currentMove === null ||
      currentAnnotation === undefined
    ) {
      return null;
    }
    if (!shouldShowTimelineMarker(currentAnnotation.type)) {
      return null;
    }
    const parsed = uciToFromTo(currentMove.moveUci);
    return parsed?.to ?? null;
  }, [replayIndex, currentMove, currentAnnotation]);

  const boardOverlay = useMemo(() => {
    if (
      badgeDestinationSquare === null ||
      currentAnnotation === undefined ||
      boardSize < 16
    ) {
      return null;
    }
    return (
      <ReviewMoveQualityBadge
        annotationType={currentAnnotation.type}
        boardWidthPx={boardSize}
        orientation={boardOrientation}
        square={badgeDestinationSquare}
      />
    );
  }, [badgeDestinationSquare, currentAnnotation, boardSize, boardOrientation]);

  const boardRegionAriaLabel = useMemo(() => {
    const qualitySuffix =
      replayIndex > 0 &&
      currentAnnotation !== undefined &&
      badgeDestinationSquare !== null
        ? reviewCopy.boardAria.moveQualitySuffix(currentAnnotation.type)
        : "";
    if (
      canShowEngineLine &&
      overlayBuild.error === null &&
      currentMove !== null
    ) {
      return reviewCopy.boardAria.positionBeforeMove(
        String(currentMove.moveNumber),
        qualitySuffix
      );
    }
    return reviewCopy.boardAria.gamePositionStep(
      String(replayIndex),
      String(moves.length),
      qualitySuffix
    );
  }, [
    canShowEngineLine,
    overlayBuild.error,
    currentMove,
    replayIndex,
    moves.length,
    currentAnnotation,
    badgeDestinationSquare,
  ]);

  const capturedPieces = useMemo(
    () => getCapturedPieces(sortedMoves.slice(0, replayIndex)),
    [sortedMoves, replayIndex]
  );

  const storedBarEval = useMemo(
    () => evaluationForReplayIndex(replayIndex, review.evaluations),
    [replayIndex, review.evaluations]
  );

  const liveBarEval = useEvaluationForFen(
    viewingFen,
    storedBarEval === null && isStockfishReady,
    isStockfishReady,
    getEvaluation
  );

  const barEvaluation = storedBarEval ?? liveBarEval;
  const showEvalBar =
    isStockfishReady || storedBarEval !== null || liveBarEval !== null;

  return (
    <GameLayoutRoot gameSurface>
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
          />
          <GameBoardArea>
            <GameBoardSquare ref={boardContainerRef}>
              <div
                className="relative flex min-w-0 items-stretch gap-3 md:gap-4"
                role="group"
                aria-label={boardRegionAriaLabel}
              >
                <GameChessboard
                  boardOverlay={boardOverlay}
                  position={boardFen}
                  orientation={boardOrientation}
                  draggable={false}
                  status="completed"
                  gameId={game._id}
                  customSquareStyles={boardSquareStyles}
                  customArrows={boardArrows}
                  boardWidth={boardSize}
                />
                {showEvalBar ? (
                  <EvaluationBar
                    evaluation={barEvaluation}
                    orientation={boardOrientation}
                  />
                ) : null}
              </div>
            </GameBoardSquare>
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

        {/* Right: review details + move history (move history grows to fill) */}
        <GameSidebarColumn variant="dense">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {reviewCopy.midReview.sidebarTitle}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/game/${gameId}/review`)}
            >
              {reviewCopy.midReview.backToOverview}
            </Button>
          </div>
          <Card className="shrink-0 bg-card">
            <CardContent className="pt-6">
              {currentMove != null ? (
                <>
                  <div className="flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                      ♔
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {reviewCopy.midReview.moveLine(
                          currentMove.moveNumber,
                          currentMove.moveSan
                        )}
                        {currentAnnotation ? (
                          <span className="ml-1 text-primary">
                            <MoveAnnotationGlyph
                              type={currentAnnotation.type}
                            />
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentAnnotation
                          ? midReviewAnnotationCaption(currentAnnotation)
                          : reviewCopy.midReview.reviewThisMove}
                      </p>
                    </div>
                  </div>
                  {canShowEngineLine && overlayBuild.error !== null ? (
                    <p className="mt-2 text-xs text-destructive">
                      {overlayBuild.error}
                    </p>
                  ) : null}
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={() =>
                      setReplayIndexAndUrl((prev) =>
                        Math.min(moves.length, prev + 1)
                      )
                    }
                    disabled={replayIndex >= moves.length}
                  >
                    {reviewCopy.midReview.next}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {reviewCopy.midReview.startPosition}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={() => setReplayIndexAndUrl(1)}
                    disabled={moves.length === 0}
                  >
                    {reviewCopy.midReview.next}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          <EngineLinesPanel
            fen={viewingFen}
            isStockfishReady={isStockfishReady && isAnalysisEngineReady}
            blockAnalysis={false}
            getEngineLines={getEngineLines}
            abortEngineLines={abortEngineLines}
            variant="review"
          />
          <MoveHistoryCard
            className="flex min-h-0 flex-1 flex-col"
            sortedMovesLength={sortedMoves.length}
            replayIndex={replayIndex}
            setReplayIndex={setReplayIndexAndUrl}
            moveHistory={moveHistory}
            moveAnnotations={review.moveAnnotations ?? undefined}
            evaluationSeries={review.evaluations ?? undefined}
          />
        </GameSidebarColumn>
      </GameLayoutMain>
    </GameLayoutRoot>
  );
}

export function ReviewPageClient({
  gameId,
  userDisplayName,
}: ReviewPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("move") !== null ? "mid-review" : "overview";

  const { game, moves } = useGame(gameId);
  const review = useQuery(
    api.reviews.getByGameId,
    game ? { gameId: game._id } : "skip"
  );
  const {
    isReady: isStockfishReady,
    isAnalysisEngineReady,
    getBestMove,
    getEvaluation,
    getEngineLines,
    abortEngineLines,
  } = useStockfish();
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

  const generateAiSummary = useAction(api.ai_game_summary.generate);
  const [aiSummaryPending, setAiSummaryPending] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [aiSummaryNotice, setAiSummaryNotice] = useState<string | null>(null);

  const handleAiSummaryAction = useCallback(
    async (regenerate: boolean) => {
      if (game === undefined || game === null) {
        return;
      }
      setAiSummaryError(null);
      setAiSummaryNotice(null);
      setAiSummaryPending(true);
      try {
        const result = await generateAiSummary({
          gameId: game._id,
          regenerate,
        });
        if (result.status === "unchanged") {
          setAiSummaryNotice(reviewCopy.aiSummary.alreadyCurrent);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : reviewCopy.aiSummary.errorGeneric;
        setAiSummaryError(message);
      } finally {
        setAiSummaryPending(false);
      }
    },
    [game, generateAiSummary]
  );

  /** Caps auto backfill retries so repeated failures cannot spin forever. */
  const analysisBackfillAttemptsRef = useRef(0);
  const [backfillExhausted, setBackfillExhausted] = useState(false);

  useEffect(() => {
    const moveCount = moves?.length ?? 0;
    const needsInitialOrBackfillAnalysis =
      review === null || reviewNeedsEvaluationsRefresh(review, moveCount);
    if (!needsInitialOrBackfillAnalysis) {
      analysisBackfillAttemptsRef.current = 0;
      setBackfillExhausted(false);
      return;
    }
    if (
      !isAnalyzing &&
      game?.status === "completed" &&
      moveCount > 0 &&
      isStockfishReady
    ) {
      if (analysisBackfillAttemptsRef.current >= 5) {
        setBackfillExhausted(true);
        return;
      }
      analysisBackfillAttemptsRef.current += 1;
      void runAnalysis();
    }
  }, [review, isAnalyzing, game?.status, moves, isStockfishReady, runAnalysis]);

  const handleRetryAnalysis = useCallback(() => {
    analysisBackfillAttemptsRef.current = 0;
    setBackfillExhausted(false);
    void runAnalysis();
  }, [runAnalysis]);

  const userAccuracy = useMemo(
    () => accuracyPercent(review?.moveAnnotations ?? undefined),
    [review?.moveAnnotations]
  );
  const counts = useMemo(
    () => moveQualityCounts(review?.moveAnnotations ?? undefined),
    [review?.moveAnnotations]
  );

  const accuracyBarStyle = useMemo(
    () => ({ width: `${String(userAccuracy ?? 0)}%` }),
    [userAccuracy]
  );

  const handleStartReview = useCallback(() => {
    router.push(`/game/${gameId}/review?move=1`);
  }, [router, gameId]);

  const handleEvaluationSeek = useCallback(
    (index: number) => {
      router.push(`/game/${gameId}/review?move=${String(index)}`);
    },
    [gameId, router]
  );

  if (!game) {
    return (
      <div className="min-h-full bg-background p-6">
        <PageLoading message={reviewCopy.pageLoadingGame} />
      </div>
    );
  }

  if (game.status !== "completed") {
    return (
      <div className="min-h-full bg-background p-6">
        <p className="text-muted-foreground">{reviewCopy.gameNotFinished}</p>
      </div>
    );
  }

  if (review === undefined) {
    return (
      <div className="min-h-full bg-background p-6">
        <PageLoading message={reviewCopy.pageLoadingReview} />
      </div>
    );
  }

  if (review === null) {
    const moveCount = moves?.length ?? 0;
    const completed = progress?.completed ?? 0;
    const total = progress?.total ?? Math.max(1, moveCount);
    const showCircle = isAnalyzing && isStockfishReady && moveCount > 0;

    if (game.status === "completed" && moveCount === 0) {
      return (
        <div className="min-h-full bg-background p-4 md:p-6">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-6 py-10 md:min-h-[55vh] md:py-16">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {reviewCopy.title}
            </h1>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {reviewCopy.analysisNoMoves}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                router.push(`/game/${gameId}`);
              }}
            >
              {reviewCopy.backToGame}
            </Button>
          </div>
        </div>
      );
    }

    const showTerminalAnalysisFailure =
      !isAnalyzing && backfillExhausted && moveCount > 0;

    if (showTerminalAnalysisFailure) {
      const message =
        analysisError !== null && analysisError !== ""
          ? analysisError
          : reviewCopy.analysisBackfillExhausted;

      return (
        <div className="min-h-full bg-background p-4 md:p-6">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-6 py-10 md:min-h-[55vh] md:py-16">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {reviewCopy.title}
            </h1>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {message}
            </p>
            <Button type="button" onClick={handleRetryAnalysis}>
              {reviewCopy.analysisRetry}
            </Button>
          </div>
        </div>
      );
    }

    const loadingSubtitle = ((): string => {
      if (!isStockfishReady) {
        return reviewCopy.loadingEngine;
      }
      if (isAnalyzing) {
        return reviewCopy.evaluatingPositions;
      }
      return reviewCopy.startingAnalysis;
    })();

    return (
      <div className="min-h-full bg-background p-4 md:p-6">
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-8 py-10 md:min-h-[55vh] md:py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {reviewCopy.title}
            </h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              {loadingSubtitle}
            </p>
          </div>
          {showCircle ? (
            <div className="flex flex-col items-center gap-6">
              <h2 className="text-lg font-semibold text-foreground">
                {reviewCopy.analyzingHeading}
              </h2>
              <CircularAnalysisProgress completed={completed} total={total} />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (mode === "mid-review") {
    return (
      <ReviewMidReview
        gameId={gameId}
        userDisplayName={userDisplayName}
        isStockfishReady={isStockfishReady}
        isAnalysisEngineReady={isAnalysisEngineReady}
        getEvaluation={getEvaluation}
        getEngineLines={getEngineLines}
        abortEngineLines={abortEngineLines}
        game={game}
        moves={moves ?? EMPTY_GAME_MOVES}
        review={review}
      />
    );
  }

  const openingLabel =
    review.openingNameLichess?.trim() ||
    getOpeningLabelFromPgn(game.pgn ?? undefined);

  return (
    <div className="min-h-full bg-background p-4 md:p-6" data-game-surface="">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {reviewCopy.title}
          </h1>
          {openingLabel ? (
            <p className="text-sm text-muted-foreground">
              {reviewCopy.openingPrefix(openingLabel)}
            </p>
          ) : null}
        </div>

        {/* Coach block */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl leading-none">
                ♔
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {isAnalyzing ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {reviewCopy.coachAnalyzing}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {progress
                        ? reviewCopy.coachProgress(
                            progress.completed,
                            progress.total
                          )
                        : reviewCopy.coachStarting}
                    </p>
                    <AnalysisProgressBar
                      completed={progress?.completed ?? 0}
                      total={
                        progress?.total ??
                        Math.max(1, (moves ?? EMPTY_GAME_MOVES).length)
                      }
                    />
                  </>
                ) : (
                  <p className="text-sm text-foreground">{review.summary}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isAnalyzing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {reviewCopy.aiSummary.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {reviewCopy.aiSummary.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {review.aiSummary?.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11"
                    disabled={aiSummaryPending}
                    onClick={() => {
                      void handleAiSummaryAction(true);
                    }}
                  >
                    {aiSummaryPending ? (
                      <>
                        <Loader2
                          aria-hidden
                          className="mr-2 size-4 shrink-0 animate-spin"
                        />
                        {reviewCopy.aiSummary.generating}
                      </>
                    ) : (
                      reviewCopy.aiSummary.regenerate
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-11"
                    disabled={aiSummaryPending}
                    onClick={() => {
                      void handleAiSummaryAction(false);
                    }}
                  >
                    {aiSummaryPending ? (
                      <>
                        <Loader2
                          aria-hidden
                          className="mr-2 size-4 shrink-0 animate-spin"
                        />
                        {reviewCopy.aiSummary.generating}
                      </>
                    ) : (
                      reviewCopy.aiSummary.generate
                    )}
                  </Button>
                )}
              </div>
              {aiSummaryNotice !== null ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {aiSummaryNotice}
                </p>
              ) : null}
              {aiSummaryError !== null ? (
                <p className="text-sm text-destructive" role="alert">
                  {aiSummaryError}
                </p>
              ) : null}
              {review.aiSummary?.trim() ? (
                <Message from="assistant">
                  <MessageContent className="max-w-none">
                    <MessageResponse>{review.aiSummary.trim()}</MessageResponse>
                  </MessageContent>
                </Message>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {review.evaluations && review.evaluations.length >= 2 ? (
          <Card className="animate-in fade-in-0 fill-mode-both slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle className="text-base">
                {reviewCopy.advantageOverTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EvaluationSparkline
                centipawns={review.evaluations}
                moveAnnotations={
                  (review.moveAnnotations ?? undefined) as
                    | MoveAnnotation[]
                    | undefined
                }
                moveCount={(moves ?? []).length}
                onSeekReplayIndex={handleEvaluationSeek}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Accuracy graph placeholder (simple bar from moveAnnotations) */}
        {review.moveAnnotations && review.moveAnnotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{reviewCopy.accuracy}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-primary transition-all"
                  style={accuracyBarStyle}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {reviewCopy.yourAccuracy(userAccuracy ?? 0)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Player comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {reviewCopy.moveQuality}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">
                  {reviewCopy.you}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {userAccuracy ?? "—"}%
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    {reviewCopy.countLabels.best}: {counts.best}
                  </li>
                  <li>
                    {reviewCopy.countLabels.good}: {counts.good}
                  </li>
                  <li>
                    {reviewCopy.countLabels.book}: {counts.book}
                  </li>
                  <li>
                    {reviewCopy.countLabels.inaccuracy}: {counts.inaccuracy}
                  </li>
                  <li>
                    {reviewCopy.countLabels.mistake}: {counts.mistake}
                  </li>
                  <li>
                    {reviewCopy.countLabels.blunder}: {counts.blunder}
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  {reviewCopy.engine}
                </p>
                <p className="text-2xl font-semibold">—</p>
                <p className="mt-2 text-muted-foreground">
                  {reviewCopy.engineMovesNotRated}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          <Button
            size="lg"
            className="min-h-11 w-full min-w-0 shrink text-center whitespace-normal"
            onClick={handleStartReview}
            disabled={isAnalyzing}
          >
            {reviewCopy.startReview}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 w-full min-w-0 shrink text-center whitespace-normal"
            disabled={isAnalyzing}
            onClick={() => {
              void runAnalysis();
            }}
          >
            {reviewCopy.rerunAnalysis}
          </Button>
        </div>
      </div>
    </div>
  );
}
