"use client";

import { CircularAnalysisProgress } from "@/components/review/review-analysis-progress";
import { ReviewMidReview } from "@/components/review/review-mid-review";
import { ReviewOverview } from "@/components/review/review-overview";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { review as reviewCopy } from "@/lib/copy";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import {
  accuracyPercent,
  moveQualityCounts,
  reviewNeedsEvaluationsRefresh,
} from "@/lib/review-page-helpers";
import { getOpeningLabelFromPgn } from "@repo/chess";
import { useAction, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const EMPTY_GAME_MOVES: Doc<"moves">[] = [];

interface ReviewPageClientProps {
  gameId: string;
  userDisplayName: string;
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
    <ReviewOverview
      moves={moves ?? EMPTY_GAME_MOVES}
      review={review}
      openingLabel={openingLabel || undefined}
      isAnalyzing={isAnalyzing}
      progress={progress}
      userAccuracy={userAccuracy}
      counts={counts}
      accuracyBarStyle={accuracyBarStyle}
      onStartReview={handleStartReview}
      onEvaluationSeek={handleEvaluationSeek}
      onRerunAnalysis={runAnalysis}
      aiSummaryPending={aiSummaryPending}
      aiSummaryError={aiSummaryError}
      aiSummaryNotice={aiSummaryNotice}
      onAiSummaryAction={handleAiSummaryAction}
    />
  );
}
