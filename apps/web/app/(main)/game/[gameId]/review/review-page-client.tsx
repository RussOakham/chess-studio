"use client";

import { GameChessboard } from "@/components/chess/game-chessboard";
import { MoveHistoryCard } from "@/components/game/move-history-card";
import type {
  MoveAnnotation,
  MoveAnnotationType,
} from "@/components/game/move-history-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useReplay } from "@/lib/hooks/use-replay";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ReviewPageClientProps {
  gameId: string;
}

function moveQualityCounts(
  moveAnnotations: { moveNumber: number; type: string }[] | undefined
) {
  if (!moveAnnotations?.length) {
    return { brilliant: 0, great: 0, best: 0, mistake: 0, miss: 0, blunder: 0 };
  }
  return {
    brilliant: moveAnnotations.filter((a) => a.type === "best").length,
    great: moveAnnotations.filter((a) => a.type === "good").length,
    best: moveAnnotations.filter((a) => a.type === "best").length,
    mistake: moveAnnotations.filter((a) => a.type === "mistake").length,
    miss: 0,
    blunder: moveAnnotations.filter((a) => a.type === "blunder").length,
  };
}

function accuracyPercent(
  moveAnnotations: { type: string }[] | undefined
): number | null {
  if (!moveAnnotations?.length) {
    return null;
  }
  const goodOrBest = moveAnnotations.filter(
    (a) => a.type === "good" || a.type === "best"
  ).length;
  return Math.round((goodOrBest / moveAnnotations.length) * 1000) / 10;
}

interface ReviewMidReviewProps {
  gameId: string;
  game: { fen: string; _id: string };
  moves: {
    moveNumber: number;
    fenBefore: string;
    fenAfter: string;
    moveSan: string;
    id: string;
  }[];
  review: {
    summary: string;
    keyMoments?: string[];
    moveAnnotations?: {
      moveNumber: number;
      type: MoveAnnotationType;
      bestMoveSan?: string;
    }[];
  };
}

function ReviewMidReview({
  gameId,
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

  const [urlSynced, setUrlSynced] = useState(false);
  useEffect(() => {
    if (urlIndex !== null && !urlSynced) {
      setReplayIndex(Math.min(urlIndex, moves.length));
      setUrlSynced(true);
    }
  }, [urlIndex, urlSynced, moves.length, setReplayIndex]);

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
    currentMoveIndex !== null ? sortedMoves[currentMoveIndex] : null;
  const currentAnnotation =
    currentMove != null && review.moveAnnotations
      ? review.moveAnnotations.find(
          (a) => a.moveNumber === currentMove.moveNumber
        )
      : undefined;

  return (
    <div className="flex min-h-full flex-col gap-4 bg-background p-4 lg:flex-row lg:gap-6 lg:p-6">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Engine
        </div>
        <GameChessboard
          position={viewingFen}
          orientation="white"
          draggable={false}
          status="completed"
          gameId={game._id}
          customSquareStyles={undefined}
        />
        <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          You
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Game Review</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/game/${gameId}/review`)}
          >
            Back to overview
          </Button>
        </div>
        <Card className="bg-card">
          <CardContent className="pt-6">
            {currentMove != null ? (
              <>
                <div className="flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                    ♔
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      Move {currentMove.moveNumber}: {currentMove.moveSan}
                      {currentAnnotation && (
                        <span className="ml-1 text-primary">
                          {currentAnnotation.type === "best"
                            ? "!!"
                            : currentAnnotation.type === "good"
                              ? "!"
                              : currentAnnotation.type === "mistake"
                                ? "?"
                                : "??"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentAnnotation?.type === "best" ||
                      currentAnnotation?.type === "good"
                        ? "Good move."
                        : currentAnnotation?.bestMoveSan
                          ? `Best: ${currentAnnotation.bestMoveSan}`
                          : "Review this move."}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={() =>
                    setReplayIndexAndUrl((p) => Math.min(moves.length, p + 1))
                  }
                  disabled={replayIndex >= moves.length}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Start position. Use the move list or Next to step through.
                </p>
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  onClick={() => setReplayIndexAndUrl(1)}
                  disabled={moves.length === 0}
                >
                  Next
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <MoveHistoryCard
          sortedMovesLength={sortedMoves.length}
          replayIndex={replayIndex}
          setReplayIndex={setReplayIndexAndUrl}
          moveHistory={moveHistory}
          moveAnnotations={
            (review.moveAnnotations ?? undefined) as
              | MoveAnnotation[]
              | undefined
          }
        />
      </div>
    </div>
  );
}

export function ReviewPageClient({ gameId }: ReviewPageClientProps) {
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
    getBestMove,
    getEvaluation,
  } = useStockfish();
  const { runAnalysis, isAnalyzing, progress } = useGameAnalysis({
    gameId,
    game: game ?? undefined,
    moves: moves ?? [],
    getEvaluation,
    getBestMove,
  });

  useEffect(() => {
    if (
      review === null &&
      !isAnalyzing &&
      game?.status === "completed" &&
      moves &&
      moves.length > 0 &&
      isStockfishReady
    ) {
      void runAnalysis();
    }
  }, [review, isAnalyzing, game?.status, moves, isStockfishReady, runAnalysis]);

  const userAccuracy = useMemo(
    () => accuracyPercent(review?.moveAnnotations ?? undefined),
    [review?.moveAnnotations]
  );
  const counts = useMemo(
    () => moveQualityCounts(review?.moveAnnotations ?? undefined),
    [review?.moveAnnotations]
  );

  const handleStartReview = useCallback(() => {
    router.push(`/game/${gameId}/review?move=1`);
  }, [router, gameId]);

  if (!game) {
    return (
      <div className="min-h-full bg-background p-6">
        <p className="text-muted-foreground">Loading game…</p>
      </div>
    );
  }

  if (game.status !== "completed") {
    return (
      <div className="min-h-full bg-background p-6">
        <p className="text-muted-foreground">
          Game is not finished. Complete the game to review.
        </p>
      </div>
    );
  }

  if (review === undefined) {
    return (
      <div className="min-h-full bg-background p-6">
        <p className="text-muted-foreground">Loading review…</p>
      </div>
    );
  }

  if (review === null) {
    return (
      <div className="min-h-full bg-background p-6">
        <p className="text-muted-foreground">
          {isAnalyzing
            ? `Analyzing… ${progress ? `Move ${progress.completed} of ${progress.total}` : ""}`
            : isStockfishReady
              ? "Starting analysis…"
              : "Loading engine…"}
        </p>
      </div>
    );
  }

  if (mode === "mid-review") {
    return (
      <ReviewMidReview
        gameId={gameId}
        game={game}
        moves={moves ?? []}
        review={review}
      />
    );
  }

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Game Review</h1>
        </div>

        {/* Coach block */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl">
                ♔
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {isAnalyzing
                    ? `Analyzing… ${progress ? `Move ${progress.completed} of ${progress.total}` : ""}`
                    : review.summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy graph placeholder (simple bar from moveAnnotations) */}
        {review.moveAnnotations && review.moveAnnotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-primary transition-all"
                  style={{
                    width: `${userAccuracy ?? 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Your accuracy: {userAccuracy ?? 0}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Player comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Move quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">You</p>
                <p className="text-2xl font-semibold text-primary">
                  {userAccuracy ?? "—"}%
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>Best: {counts.best}</li>
                  <li>Great: {counts.great}</li>
                  <li>Mistake: {counts.mistake}</li>
                  <li>Blunder: {counts.blunder}</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Engine</p>
                <p className="text-2xl font-semibold">—</p>
                <p className="mt-2 text-muted-foreground">
                  Engine moves not rated
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Review CTA */}
        <Button
          size="lg"
          className="w-full max-w-sm"
          onClick={handleStartReview}
          disabled={isAnalyzing}
        >
          Start Review
        </Button>
      </div>
    </div>
  );
}
