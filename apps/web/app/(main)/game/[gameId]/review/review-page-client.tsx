"use client";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { EvaluationSparkline } from "@/components/chess/evaluation-sparkline";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { useBoardContainerSize } from "@/lib/hooks/use-board-container-size";
import { useEvaluationForFen } from "@/lib/hooks/use-evaluation-for-fen";
import { useGame } from "@/lib/hooks/use-game";
import { useGameAnalysis } from "@/lib/hooks/use-game-analysis";
import { useReplay } from "@/lib/hooks/use-replay";
import { useStockfish } from "@/lib/hooks/use-stockfish";
import { evaluationForReplayIndex } from "@/lib/review-evaluation";
import { getOpeningLabelFromPgn } from "@repo/chess";
import type {
  MoveAnnotation,
  MoveAnnotationType,
  PositionEvaluation,
} from "@repo/chess";
import { useQuery } from "convex/react";
import { Bot, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

interface ReviewPageClientProps {
  gameId: string;
  userDisplayName: string;
}

function moveQualityCounts(
  moveAnnotations: { moveNumber: number; type: string }[] | undefined
) {
  if (!moveAnnotations?.length) {
    return { good: 0, best: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
  }
  return {
    good: moveAnnotations.filter((ann) => ann.type === "good").length,
    best: moveAnnotations.filter((ann) => ann.type === "best").length,
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
    (ann) => ann.type === "good" || ann.type === "best"
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

function midReviewAnnotationGlyph(type: MoveAnnotationType): string {
  switch (type) {
    case "best": {
      return "!!";
    }
    case "good": {
      return "!";
    }
    case "inaccuracy": {
      return "?!";
    }
    case "mistake": {
      return "?";
    }
    case "blunder": {
      return "??";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function midReviewAnnotationCaption(annotation: {
  type: MoveAnnotationType;
  bestMoveSan?: string;
}): string {
  switch (annotation.type) {
    case "best": {
      return annotation.bestMoveSan
        ? `Best move — engine prefers ${annotation.bestMoveSan}.`
        : "Best move.";
    }
    case "good": {
      return annotation.bestMoveSan
        ? `Good move — engine prefers ${annotation.bestMoveSan}.`
        : "Good move.";
    }
    case "inaccuracy": {
      return annotation.bestMoveSan
        ? `Inaccuracy — engine prefers ${annotation.bestMoveSan}.`
        : "Inaccuracy — small eval slip.";
    }
    case "blunder": {
      return annotation.bestMoveSan
        ? `Blunder — engine prefers ${annotation.bestMoveSan}.`
        : "Blunder.";
    }
    case "mistake": {
      return annotation.bestMoveSan
        ? `Mistake — engine prefers ${annotation.bestMoveSan}.`
        : "Mistake.";
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
  getEvaluation: (fen: string) => Promise<PositionEvaluation>;
  game: {
    fen: string;
    _id: string;
    difficulty: "easy" | "medium" | "hard";
    color: "white" | "black" | "random";
  };
  moves: Doc<"moves">[];
  review: {
    summary: string;
    evaluations?: number[];
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
  userDisplayName,
  isStockfishReady,
  getEvaluation,
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
    currentMoveIndex !== null ? sortedMoves[currentMoveIndex] : null;
  const currentAnnotation =
    currentMove != null && review.moveAnnotations
      ? review.moveAnnotations.find(
          (ann) => ann.moveNumber === currentMove.moveNumber
        )
      : undefined;

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const boardSize = useBoardContainerSize(boardContainerRef);

  const playerColor = game.color === "random" ? "white" : game.color;
  const playerColorLabel = playerColor === "white" ? "White" : "Black";
  const opponentColorLabel = playerColor === "white" ? "Black" : "White";
  const boardOrientation: "white" | "black" =
    playerColor === "black" ? "black" : "white";
  const opponentLabel = `Engine (${game.difficulty})`;

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
              <div className="relative flex min-w-0 items-stretch gap-3 md:gap-4">
                <GameChessboard
                  position={viewingFen}
                  orientation={boardOrientation}
                  draggable={false}
                  status="completed"
                  gameId={game._id}
                  customSquareStyles={undefined}
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
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Game Review
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/game/${gameId}/review`)}
            >
              Back to overview
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
                        Move {currentMove.moveNumber}: {currentMove.moveSan}
                        {currentAnnotation ? (
                          <span className="ml-1 text-primary">
                            {midReviewAnnotationGlyph(currentAnnotation.type)}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {currentAnnotation
                          ? midReviewAnnotationCaption(currentAnnotation)
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
            className="flex min-h-0 flex-1 flex-col"
            sortedMovesLength={sortedMoves.length}
            replayIndex={replayIndex}
            setReplayIndex={setReplayIndexAndUrl}
            moveHistory={moveHistory}
            moveAnnotations={
              (review.moveAnnotations ?? undefined) as
                | MoveAnnotation[]
                | undefined
            }
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
    getBestMove,
    getEvaluation,
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

  useEffect(() => {
    const moveCount = moves?.length ?? 0;
    const needsInitialOrBackfillAnalysis =
      review === null || reviewNeedsEvaluationsRefresh(review, moveCount);
    if (
      needsInitialOrBackfillAnalysis &&
      !isAnalyzing &&
      analysisError === null &&
      game?.status === "completed" &&
      moveCount > 0 &&
      isStockfishReady
    ) {
      void runAnalysis();
    }
  }, [
    review,
    isAnalyzing,
    analysisError,
    game?.status,
    moves,
    isStockfishReady,
    runAnalysis,
  ]);

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

  const handleEvaluationSeek = useCallback(
    (index: number) => {
      router.push(`/game/${gameId}/review?move=${String(index)}`);
    },
    [gameId, router]
  );

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
        userDisplayName={userDisplayName}
        isStockfishReady={isStockfishReady}
        getEvaluation={getEvaluation}
        game={game}
        moves={moves ?? []}
        review={review}
      />
    );
  }

  const openingLabel = getOpeningLabelFromPgn(game.pgn ?? undefined);

  return (
    <div className="min-h-full bg-background p-4 md:p-6" data-game-surface="">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Game Review
          </h1>
          {openingLabel ? (
            <p className="text-sm text-muted-foreground">
              Opening: {openingLabel}
            </p>
          ) : null}
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

        {review.evaluations && review.evaluations.length >= 2 ? (
          <Card className="animate-in fade-in-0 fill-mode-both slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle className="text-base">Advantage over time</CardTitle>
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
                  <li>Good: {counts.good}</li>
                  <li>Inaccuracy: {counts.inaccuracy}</li>
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
