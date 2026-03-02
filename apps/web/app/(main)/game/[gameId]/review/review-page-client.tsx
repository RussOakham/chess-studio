"use client";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
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
import type { PositionEvaluation } from "@repo/chess";
import { useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const TIMELINE_CP_CLAMP = 600;
const TIMELINE_WIDTH = 720;
const TIMELINE_HEIGHT = 132;
const TIMELINE_PADDING_X = 16;
const TIMELINE_PADDING_Y = 12;

interface ReviewPageClientProps {
  gameId: string;
}

type ReviewMoveAnnotation = MoveAnnotation & {
  evaluation?: number;
  cpLoss?: number;
};

interface ReviewMove {
  moveNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveSan: string;
  id: string;
  createdAt?: number;
}

type PlayerColor = "white" | "black";

function resolvePlayerColor(
  color: "white" | "black" | "random" | undefined
): PlayerColor {
  return color === "black" ? "black" : "white";
}

function isPlayerMove(moveNumber: number, playerColor: PlayerColor): boolean {
  const isWhiteMove = moveNumber % 2 === 1;
  return playerColor === "white" ? isWhiteMove : !isWhiteMove;
}

interface EvaluationTimelinePoint {
  moveNumber: number;
  elapsedMs: number;
  evaluation: number | null;
  type?: MoveAnnotationType;
}

function moveQualityCounts(
  moveAnnotations: ReviewMoveAnnotation[] | undefined,
  playerColor: PlayerColor
) {
  const counts = {
    brilliant: 0,
    great: 0,
    best: 0,
    good: 0,
    mistake: 0,
    blunder: 0,
  };
  if (!moveAnnotations?.length) {
    return counts;
  }
  for (const annotation of moveAnnotations) {
    if (!isPlayerMove(annotation.moveNumber, playerColor)) {
      continue;
    }
    switch (annotation.type) {
      case "brilliant": {
        counts.brilliant += 1;
        break;
      }
      case "great": {
        counts.great += 1;
        break;
      }
      case "best": {
        counts.best += 1;
        break;
      }
      case "good": {
        counts.good += 1;
        break;
      }
      case "mistake": {
        counts.mistake += 1;
        break;
      }
      case "blunder": {
        counts.blunder += 1;
        break;
      }
      default: {
        const _: never = annotation.type;
        void _;
      }
    }
  }
  return counts;
}

function accuracyPercent(
  moveAnnotations: ReviewMoveAnnotation[] | undefined,
  playerColor: PlayerColor
): number | null {
  if (!moveAnnotations?.length) {
    return null;
  }
  const strongMoves = moveAnnotations.filter(
    (annotation) =>
      (annotation.type === "good" ||
        annotation.type === "best" ||
        annotation.type === "great" ||
        annotation.type === "brilliant") &&
      isPlayerMove(annotation.moveNumber, playerColor)
  ).length;
  const playerMoveCount = moveAnnotations.filter((annotation) =>
    isPlayerMove(annotation.moveNumber, playerColor)
  ).length;
  if (playerMoveCount === 0) {
    return null;
  }
  return Math.round((strongMoves / playerMoveCount) * 1000) / 10;
}

function annotationBadge(type: MoveAnnotationType): string {
  switch (type) {
    case "brilliant": {
      return "!!";
    }
    case "great": {
      return "!";
    }
    case "best": {
      return "★";
    }
    case "good": {
      return "✓";
    }
    case "mistake": {
      return "?!";
    }
    case "blunder": {
      return "??";
    }
    default: {
      const _: never = type;
      void _;
      return "";
    }
  }
}

function annotationLabel(type: MoveAnnotationType): string {
  switch (type) {
    case "brilliant": {
      return "Brilliant";
    }
    case "great": {
      return "Great";
    }
    case "best": {
      return "Best";
    }
    case "good": {
      return "Good";
    }
    case "mistake": {
      return "Mistake";
    }
    case "blunder": {
      return "Blunder";
    }
    default: {
      const _: never = type;
      void _;
      return "Review";
    }
  }
}

function annotationDotClassName(type: MoveAnnotationType | undefined): string {
  if (type === "brilliant") {
    return "bg-sky-500";
  }
  if (type === "great" || type === "best") {
    return "bg-emerald-500";
  }
  if (type === "good") {
    return "bg-lime-500";
  }
  if (type === "mistake") {
    return "bg-amber-500";
  }
  if (type === "blunder") {
    return "bg-red-500";
  }
  return "bg-primary/70";
}

function annotationTextClassName(type: MoveAnnotationType | undefined): string {
  if (type === "brilliant") {
    return "text-sky-600 dark:text-sky-400";
  }
  if (type === "great" || type === "best") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (type === "good") {
    return "text-lime-700 dark:text-lime-400";
  }
  if (type === "mistake") {
    return "text-amber-700 dark:text-amber-400";
  }
  if (type === "blunder") {
    return "text-red-600 dark:text-red-400";
  }
  return "text-muted-foreground";
}

function annotationColorValue(type: MoveAnnotationType | undefined): string {
  if (type === "brilliant") {
    return "#0ea5e9";
  }
  if (type === "great" || type === "best") {
    return "#22c55e";
  }
  if (type === "good") {
    return "#84cc16";
  }
  if (type === "mistake") {
    return "#f59e0b";
  }
  if (type === "blunder") {
    return "#ef4444";
  }
  return "#8b5cf6";
}

function formatEvaluationCp(cp: number): string {
  const pawns = cp / 100;
  return pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
}

function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildMoveReasoning(
  annotation: ReviewMoveAnnotation | undefined
): string {
  if (!annotation) {
    return "Step through the moves to see the position-by-position review.";
  }
  const cpLossText =
    typeof annotation.cpLoss === "number" && annotation.cpLoss > 0
      ? ` It cost about ${(annotation.cpLoss / 100).toFixed(1)} pawns.`
      : "";
  const bestMoveText = annotation.bestMoveSan
    ? ` Best was ${annotation.bestMoveSan}.`
    : "";

  switch (annotation.type) {
    case "brilliant": {
      return "Brilliant move. You found the top engine continuation and created a major swing.";
    }
    case "great": {
      return "Great move. You picked the engine line and clearly improved the position.";
    }
    case "best": {
      return "Best move. You matched the engine's preferred continuation.";
    }
    case "good": {
      return "Solid move. You kept the position stable without giving up a major advantage.";
    }
    case "mistake": {
      return `This was a mistake.${cpLossText}${bestMoveText}`;
    }
    case "blunder": {
      return `This was a blunder.${cpLossText}${bestMoveText}`;
    }
    default: {
      const _: never = annotation.type;
      void _;
      return "Review this move and compare it with the engine continuation.";
    }
  }
}

function ReviewEvaluationTimeline({
  points,
  currentMoveNumber,
}: {
  points: EvaluationTimelinePoint[];
  currentMoveNumber: number | null;
}) {
  const totalElapsedMs = points.at(-1)?.elapsedMs ?? 0;
  const elapsedDenominator = Math.max(totalElapsedMs, 1);

  const plottedPoints = useMemo(() => {
    const result: Array<
      EvaluationTimelinePoint & { index: number; evaluation: number }
    > = [];
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (point && typeof point.evaluation === "number") {
        result.push({ ...point, index, evaluation: point.evaluation });
      }
    }
    return result;
  }, [points]);

  const xForElapsed = useCallback(
    (elapsedMs: number) =>
      TIMELINE_PADDING_X +
      (elapsedMs / elapsedDenominator) *
        (TIMELINE_WIDTH - TIMELINE_PADDING_X * 2),
    [elapsedDenominator]
  );

  const yForEvaluation = useCallback((evaluation: number) => {
    const clamped = Math.max(
      -TIMELINE_CP_CLAMP,
      Math.min(TIMELINE_CP_CLAMP, evaluation)
    );
    const normalized =
      (TIMELINE_CP_CLAMP - clamped) / (TIMELINE_CP_CLAMP * 2 || 1);
    return (
      TIMELINE_PADDING_Y +
      normalized * (TIMELINE_HEIGHT - TIMELINE_PADDING_Y * 2)
    );
  }, []);

  const linePath = useMemo(
    () =>
      plottedPoints
        .map((point, index) => {
          const x = xForElapsed(point.elapsedMs);
          const y = yForEvaluation(point.evaluation);
          return `${index === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" "),
    [plottedPoints, xForElapsed, yForEvaluation]
  );

  const zeroY = yForEvaluation(0);
  const halfElapsedMs = Math.round(totalElapsedMs / 2);
  const currentPoint = useMemo(
    () =>
      currentMoveNumber !== null
        ? points.find((point) => point.moveNumber === currentMoveNumber)
        : undefined,
    [currentMoveNumber, points]
  );

  return (
    <Card className="shrink-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Evaluation over time</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {plottedPoints.length > 0 ? (
          <>
            <svg
              className="h-32 w-full"
              viewBox={`0 0 ${TIMELINE_WIDTH} ${TIMELINE_HEIGHT}`}
              role="img"
              aria-label="Evaluation trend over game time"
            >
              <line
                x1={TIMELINE_PADDING_X}
                x2={TIMELINE_WIDTH - TIMELINE_PADDING_X}
                y1={zeroY}
                y2={zeroY}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                strokeOpacity="0.35"
                strokeDasharray="4 4"
              />
              <path
                d={linePath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.25"
              />
              {plottedPoints.map((point) => (
                <circle
                  key={`point-${point.moveNumber}`}
                  cx={xForElapsed(point.elapsedMs)}
                  cy={yForEvaluation(point.evaluation)}
                  r={point.moveNumber === currentMoveNumber ? 4.5 : 3}
                  fill={annotationColorValue(point.type)}
                  stroke={
                    point.moveNumber === currentMoveNumber
                      ? "hsl(var(--background))"
                      : "transparent"
                  }
                  strokeWidth="2"
                />
              ))}
            </svg>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatElapsedTime(0)}</span>
              <span>{formatElapsedTime(halfElapsedMs)}</span>
              <span>{formatElapsedTime(totalElapsedMs)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {currentPoint && typeof currentPoint.evaluation === "number"
                ? `Current move eval: ${formatEvaluationCp(currentPoint.evaluation)}`
                : "Select a move to inspect its evaluation."}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Detailed evaluation points are still being generated.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ReviewMidReviewProps {
  gameId: string;
  game: {
    fen: string;
    _id: string;
    createdAt: number;
    color: "white" | "black" | "random";
  };
  moves: ReviewMove[];
  review: {
    summary: string;
    keyMoments?: string[];
    moveAnnotations?: ReviewMoveAnnotation[];
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
  const boardOrientation = resolvePlayerColor(game.color);
  const moveParam = searchParams.get("move");
  const urlIndex =
    moveParam !== null ? Math.max(0, parseInt(moveParam, 10) || 0) : null;

  const { replayIndex, setReplayIndex, sortedMoves, viewingFen, moveHistory } =
    useReplay(moves, game.fen);
  const replayIndexRef = useRef(replayIndex);
  useEffect(() => {
    replayIndexRef.current = replayIndex;
  }, [replayIndex]);

  const annotationByMoveNumber = useMemo(() => {
    const annotationMap = new Map<number, ReviewMoveAnnotation>();
    if (!review.moveAnnotations?.length) {
      return annotationMap;
    }
    for (const annotation of review.moveAnnotations) {
      annotationMap.set(annotation.moveNumber, annotation);
    }
    return annotationMap;
  }, [review.moveAnnotations]);

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
      const currentIndex = replayIndexRef.current;
      const next = Math.max(
        0,
        Math.min(
          moves.length,
          typeof value === "function" ? value(currentIndex) : value
        )
      );
      setReplayIndex(next);
      router.replace(`/game/${gameId}/review?move=${next}`, { scroll: false });
    },
    [gameId, moves.length, router, setReplayIndex]
  );

  const currentMoveIndex = replayIndex > 0 ? replayIndex - 1 : null;
  const currentMove =
    currentMoveIndex !== null ? sortedMoves[currentMoveIndex] : null;
  const currentAnnotation =
    currentMove != null
      ? annotationByMoveNumber.get(currentMove.moveNumber)
      : undefined;

  const evaluationTimeline = useMemo(() => {
    const startTimestamp = sortedMoves[0]?.createdAt ?? game.createdAt;
    return sortedMoves.map((move, index) => {
      const annotation = annotationByMoveNumber.get(move.moveNumber);
      const moveTimestamp =
        move.createdAt ?? startTimestamp + index * 30_000 /* fallback */;
      return {
        moveNumber: move.moveNumber,
        elapsedMs: Math.max(0, moveTimestamp - startTimestamp),
        evaluation:
          typeof annotation?.evaluation === "number"
            ? annotation.evaluation
            : null,
        type: annotation?.type,
      };
    });
  }, [annotationByMoveNumber, game.createdAt, sortedMoves]);

  const currentEvaluation = useMemo<PositionEvaluation | null>(() => {
    if (replayIndex === 0) {
      return { type: "cp", value: 0 };
    }
    if (typeof currentAnnotation?.evaluation === "number") {
      return { type: "cp", value: currentAnnotation.evaluation };
    }
    return null;
  }, [currentAnnotation?.evaluation, replayIndex]);

  const currentEvaluationLabel = useMemo(() => {
    if (replayIndex === 0) {
      return "0.00";
    }
    if (typeof currentAnnotation?.evaluation === "number") {
      return formatEvaluationCp(currentAnnotation.evaluation);
    }
    return "—";
  }, [currentAnnotation?.evaluation, replayIndex]);

  const currentReasoning = useMemo(
    () => buildMoveReasoning(currentAnnotation),
    [currentAnnotation]
  );

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
      const availableWidth = Math.max(200, w - 48);
      const side = Math.min(availableWidth, h);
      setBoardSize(Math.max(200, side - 16));
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Center: board column */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-full">
          <div className="flex w-full shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Engine
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div
              ref={boardContainerRef}
              className="flex aspect-square h-full max-w-full items-center justify-center"
            >
              <div className="flex h-full items-stretch gap-3">
                <EvaluationBar
                  className="shrink-0"
                  evaluation={currentEvaluation}
                  orientation={boardOrientation}
                />
                <GameChessboard
                  position={viewingFen}
                  orientation={boardOrientation}
                  draggable={false}
                  status="completed"
                  gameId={game._id}
                  customSquareStyles={undefined}
                  boardWidth={boardSize}
                />
              </div>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            You
          </div>
        </div>

        {/* Right: review details + move history + eval timeline */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden lg:w-auto lg:max-w-md">
          <div className="flex shrink-0 items-center justify-between">
            <h2 className="text-lg font-semibold">Game Review</h2>
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
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Move {currentMove.moveNumber}: {currentMove.moveSan}
                        </p>
                        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                          {currentEvaluationLabel}
                        </span>
                      </div>
                      {currentAnnotation ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${annotationDotClassName(
                              currentAnnotation.type
                            )}`}
                            aria-hidden
                          />
                          <span
                            className={`text-xs font-semibold ${annotationTextClassName(
                              currentAnnotation.type
                            )}`}
                          >
                            {annotationLabel(currentAnnotation.type)}{" "}
                            {annotationBadge(currentAnnotation.type)}
                          </span>
                        </div>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {currentReasoning}
                      </p>
                    </div>
                  </div>
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
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            sortedMovesLength={sortedMoves.length}
            replayIndex={replayIndex}
            setReplayIndex={setReplayIndexAndUrl}
            moveHistory={moveHistory}
            moveAnnotations={review.moveAnnotations}
          />
          <ReviewEvaluationTimeline
            points={evaluationTimeline}
            currentMoveNumber={currentMove?.moveNumber ?? null}
          />
        </div>
      </main>
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
  const playerColor = useMemo(
    () => resolvePlayerColor(game?.color),
    [game?.color]
  );

  const reviewMoveAnnotations = useMemo(
    () =>
      (review?.moveAnnotations ?? undefined) as
        | ReviewMoveAnnotation[]
        | undefined,
    [review?.moveAnnotations]
  );

  const needsEnhancedAnalysis = useMemo(() => {
    if (!reviewMoveAnnotations?.length) {
      return false;
    }
    return reviewMoveAnnotations.some(
      (annotation) =>
        typeof annotation.evaluation !== "number" ||
        typeof annotation.cpLoss !== "number"
    );
  }, [reviewMoveAnnotations]);

  const initialAnalysisTriggeredRef = useRef(false);
  const enhancementTriggeredRef = useRef(false);
  useEffect(() => {
    initialAnalysisTriggeredRef.current = false;
    enhancementTriggeredRef.current = false;
  }, [gameId]);

  useEffect(() => {
    if (
      review === null &&
      !initialAnalysisTriggeredRef.current &&
      !isAnalyzing &&
      game?.status === "completed" &&
      moves &&
      moves.length > 0 &&
      isStockfishReady
    ) {
      initialAnalysisTriggeredRef.current = true;
      void runAnalysis();
    }
  }, [review, isAnalyzing, game?.status, moves, isStockfishReady, runAnalysis]);

  useEffect(() => {
    if (
      review !== null &&
      review !== undefined &&
      needsEnhancedAnalysis &&
      !enhancementTriggeredRef.current &&
      !isAnalyzing &&
      game?.status === "completed" &&
      moves &&
      moves.length > 0 &&
      isStockfishReady
    ) {
      enhancementTriggeredRef.current = true;
      void runAnalysis();
    }
  }, [
    game?.status,
    isAnalyzing,
    isStockfishReady,
    moves,
    needsEnhancedAnalysis,
    review,
    runAnalysis,
  ]);

  const userAccuracy = useMemo(
    () => accuracyPercent(reviewMoveAnnotations, playerColor),
    [playerColor, reviewMoveAnnotations]
  );
  const counts = useMemo(
    () => moveQualityCounts(reviewMoveAnnotations, playerColor),
    [playerColor, reviewMoveAnnotations]
  );

  const overviewEvaluationTimeline = useMemo(() => {
    if (!moves?.length) {
      return [] as EvaluationTimelinePoint[];
    }
    const annotationsByMove = new Map<number, ReviewMoveAnnotation>();
    for (const annotation of reviewMoveAnnotations ?? []) {
      annotationsByMove.set(annotation.moveNumber, annotation);
    }
    const startTimestamp = moves[0]?.createdAt ?? game?.createdAt ?? Date.now();
    return moves.map((move, index) => {
      const annotation = annotationsByMove.get(move.moveNumber);
      const moveTimestamp =
        move.createdAt ?? startTimestamp + index * 30_000 /* fallback */;
      return {
        moveNumber: move.moveNumber,
        elapsedMs: Math.max(0, moveTimestamp - startTimestamp),
        evaluation:
          typeof annotation?.evaluation === "number"
            ? annotation.evaluation
            : null,
        type: annotation?.type,
      };
    });
  }, [game?.createdAt, moves, reviewMoveAnnotations]);

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
      <div className="flex min-h-full flex-col gap-3 bg-background p-6">
        <p className="text-muted-foreground">
          {isAnalyzing
            ? `Analyzing… ${progress ? `Move ${progress.completed} of ${progress.total}` : ""}`
            : analysisError
              ? `Analysis failed: ${analysisError}`
              : isStockfishReady
                ? "Starting analysis…"
                : "Loading engine…"}
        </p>
        {analysisError ? (
          <Button
            className="w-full max-w-sm"
            onClick={() => {
              initialAnalysisTriggeredRef.current = true;
              void runAnalysis();
            }}
          >
            Retry analysis
          </Button>
        ) : null}
      </div>
    );
  }

  if (mode === "mid-review") {
    return (
      <ReviewMidReview
        gameId={gameId}
        game={game}
        moves={moves ?? []}
        review={{
          summary: review.summary,
          keyMoments: review.keyMoments,
          moveAnnotations: reviewMoveAnnotations,
        }}
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
                {needsEnhancedAnalysis && !isAnalyzing ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updating analysis to include richer evaluation data…
                  </p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accuracy bar */}
        {reviewMoveAnnotations && reviewMoveAnnotations.length > 0 && (
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

        <ReviewEvaluationTimeline
          points={overviewEvaluationTimeline}
          currentMoveNumber={null}
        />

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
                  <li className="text-sky-600 dark:text-sky-400">
                    Brilliant: {counts.brilliant}
                  </li>
                  <li className="text-emerald-600 dark:text-emerald-400">
                    Great: {counts.great}
                  </li>
                  <li>Best: {counts.best}</li>
                  <li>Good: {counts.good}</li>
                  <li className="text-amber-700 dark:text-amber-400">
                    Mistake: {counts.mistake}
                  </li>
                  <li className="text-red-600 dark:text-red-400">
                    Blunder: {counts.blunder}
                  </li>
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
