"use client";

import { EvaluationBar } from "@/components/chess/evaluation-bar";
import { GameChessboard } from "@/components/chess/game-chessboard";
import { EvaluationTimeline } from "@/components/game/evaluation-timeline";
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

interface ReviewPageClientProps {
  gameId: string;
}

function moveQualityCounts(
  moveAnnotations: { moveNumber: number; type: string }[] | undefined
) {
  if (!moveAnnotations?.length) {
    return {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };
  }
  return {
    brilliant: moveAnnotations.filter((ann) => ann.type === "brilliant").length,
    great: moveAnnotations.filter((ann) => ann.type === "great").length,
    best: moveAnnotations.filter((ann) => ann.type === "best").length,
    excellent: moveAnnotations.filter((ann) => ann.type === "excellent").length,
    good: moveAnnotations.filter((ann) => ann.type === "good").length,
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
  const goodMoves = moveAnnotations.filter(
    (a) =>
      a.type === "brilliant" ||
      a.type === "great" ||
      a.type === "best" ||
      a.type === "excellent" ||
      a.type === "good" ||
      a.type === "book"
  ).length;
  return Math.round((goodMoves / moveAnnotations.length) * 1000) / 10;
}

interface MoveEvaluation {
  moveNumber: number;
  evalAfter: number;
  isMate?: boolean;
  mateIn?: number;
}

interface MoveAnnotationWithEval {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
  evalBefore?: number;
  evalAfter?: number;
  isMate?: boolean;
  mateIn?: number;
}

function getAnnotationLabel(type: MoveAnnotationType): string {
  switch (type) {
    case "brilliant": {
      return "Brilliant!";
    }
    case "great": {
      return "Great move!";
    }
    case "best": {
      return "Best move";
    }
    case "excellent": {
      return "Excellent";
    }
    case "good": {
      return "Good move";
    }
    case "book": {
      return "Book move";
    }
    case "inaccuracy": {
      return "Inaccuracy";
    }
    case "mistake": {
      return "Mistake";
    }
    case "miss": {
      return "Missed win";
    }
    case "blunder": {
      return "Blunder";
    }
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

function getAnnotationExplanation(
  type: MoveAnnotationType,
  evalChange?: number,
  bestMoveSan?: string
): string {
  const evalLoss =
    evalChange !== undefined && evalChange < 0
      ? Math.abs(evalChange / 100).toFixed(1)
      : null;

  switch (type) {
    case "brilliant": {
      return "An exceptional move that's hard to find and creates winning chances.";
    }
    case "great": {
      return "A strong move that significantly improves your position.";
    }
    case "best": {
      return "This was the engine's top choice. Well played!";
    }
    case "excellent": {
      return "Very close to the best move - excellent play.";
    }
    case "good": {
      return "A solid move that maintains your position.";
    }
    case "book": {
      return "A standard opening move from theory.";
    }
    case "inaccuracy": {
      return evalLoss
        ? `A small slip${bestMoveSan ? `. ${bestMoveSan} was better` : ""} (−${evalLoss}).`
        : `A small inaccuracy${bestMoveSan ? `. ${bestMoveSan} was better` : ""}.`;
    }
    case "mistake": {
      return evalLoss
        ? `This loses advantage${bestMoveSan ? `. ${bestMoveSan} was better` : ""} (−${evalLoss}).`
        : `A mistake${bestMoveSan ? `. ${bestMoveSan} was better` : ""}.`;
    }
    case "miss": {
      return bestMoveSan
        ? `You missed a winning opportunity with ${bestMoveSan}.`
        : "You missed a winning opportunity.";
    }
    case "blunder": {
      return evalLoss
        ? `A serious error${bestMoveSan ? `. ${bestMoveSan} was much better` : ""} (−${evalLoss}).`
        : `A blunder${bestMoveSan ? `. ${bestMoveSan} was much better` : ""}.`;
    }
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

function getAnnotationIconConfig(type: MoveAnnotationType): {
  bgColor: string;
  textColor: string;
  symbol: string;
} | null {
  switch (type) {
    case "brilliant": {
      return {
        bgColor: "bg-cyan-400",
        textColor: "text-cyan-950",
        symbol: "!!",
      };
    }
    case "great": {
      return {
        bgColor: "bg-blue-400",
        textColor: "text-blue-950",
        symbol: "!",
      };
    }
    case "best": {
      return {
        bgColor: "bg-emerald-500",
        textColor: "text-emerald-950",
        symbol: "★",
      };
    }
    case "excellent": {
      return {
        bgColor: "bg-green-400",
        textColor: "text-green-950",
        symbol: "✓",
      };
    }
    case "good": {
      return null;
    }
    case "book": {
      return {
        bgColor: "bg-amber-300",
        textColor: "text-amber-950",
        symbol: "📖",
      };
    }
    case "inaccuracy": {
      return {
        bgColor: "bg-yellow-400",
        textColor: "text-yellow-950",
        symbol: "?!",
      };
    }
    case "mistake": {
      return {
        bgColor: "bg-orange-400",
        textColor: "text-orange-950",
        symbol: "?",
      };
    }
    case "miss": {
      return {
        bgColor: "bg-orange-500",
        textColor: "text-orange-950",
        symbol: "?",
      };
    }
    case "blunder": {
      return { bgColor: "bg-red-500", textColor: "text-red-950", symbol: "??" };
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function getAnnotationLabelColor(type: MoveAnnotationType | undefined): string {
  if (!type) {
    return "text-foreground";
  }
  switch (type) {
    case "blunder": {
      return "text-red-500";
    }
    case "mistake": {
      return "text-orange-500";
    }
    case "inaccuracy": {
      return "text-yellow-600";
    }
    case "brilliant": {
      return "text-cyan-500";
    }
    case "great": {
      return "text-blue-500";
    }
    case "best":
    case "excellent":
    case "good":
    case "book":
    case "miss": {
      return "text-emerald-500";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function getEvalChangeClass(evalChange: number | undefined): string {
  if (evalChange === undefined) {
    return "bg-muted text-muted-foreground";
  }
  if (evalChange < -50) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  if (evalChange > 50) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  }
  return "bg-muted text-muted-foreground";
}

function MoveExplanationCard({
  currentMove,
  currentAnnotation,
  replayIndex,
  movesLength,
  onNext,
  onStart,
}: {
  currentMove: { moveNumber: number; moveSan: string } | null;
  currentAnnotation: MoveAnnotationWithEval | undefined;
  replayIndex: number;
  movesLength: number;
  onNext: () => void;
  onStart: () => void;
}) {
  const iconConfig = currentAnnotation
    ? getAnnotationIconConfig(currentAnnotation.type)
    : null;

  const evalChange =
    currentAnnotation?.evalBefore !== undefined &&
    currentAnnotation?.evalAfter !== undefined
      ? currentAnnotation.evalAfter - currentAnnotation.evalBefore
      : undefined;

  const label = currentAnnotation
    ? getAnnotationLabel(currentAnnotation.type)
    : null;
  const explanation = currentAnnotation
    ? getAnnotationExplanation(
        currentAnnotation.type,
        evalChange,
        currentAnnotation.bestMoveSan
      )
    : null;

  const evalDisplay = useMemo(() => {
    if (currentAnnotation?.evalAfter === undefined) {
      return null;
    }
    if (currentAnnotation.isMate) {
      return `M${currentAnnotation.mateIn ?? "?"}`;
    }
    return (currentAnnotation.evalAfter / 100).toFixed(1);
  }, [currentAnnotation]);

  return (
    <Card className="shrink-0 bg-card">
      <CardContent className="pt-6">
        {currentMove != null ? (
          <>
            <div className="flex gap-3">
              {iconConfig ? (
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold ${iconConfig.bgColor} ${iconConfig.textColor}`}
                >
                  {iconConfig.symbol}
                </div>
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                  ♔
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Move {currentMove.moveNumber}: {currentMove.moveSan}
                    {label && (
                      <span
                        className={`ml-2 ${getAnnotationLabelColor(currentAnnotation?.type)}`}
                      >
                        {label}
                      </span>
                    )}
                  </p>
                  {evalDisplay && (
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${getEvalChangeClass(evalChange)}`}
                    >
                      {evalDisplay}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {explanation ?? "Review this move."}
                </p>
                {currentAnnotation?.bestMoveSan &&
                  (currentAnnotation.type === "blunder" ||
                    currentAnnotation.type === "mistake" ||
                    currentAnnotation.type === "inaccuracy") && (
                    <p className="mt-1 text-xs font-medium text-primary">
                      Best: {currentAnnotation.bestMoveSan}
                    </p>
                  )}
              </div>
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              onClick={onNext}
              disabled={replayIndex >= movesLength}
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
              onClick={onStart}
              disabled={movesLength === 0}
            >
              Next
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
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
      evalBefore?: number;
      evalAfter?: number;
      isMate?: boolean;
      mateIn?: number;
    }[];
    moveEvaluations?: MoveEvaluation[];
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
          (a) => a.moveNumber === currentMove.moveNumber
        )
      : undefined;

  const currentEvaluation = useMemo((): PositionEvaluation | null => {
    if (replayIndex === 0) {
      return { type: "cp", value: 0 };
    }
    if (!review.moveEvaluations?.length) {
      if (currentAnnotation?.evalAfter !== undefined) {
        return currentAnnotation.isMate
          ? { type: "mate", value: currentAnnotation.mateIn ?? 0 }
          : { type: "cp", value: currentAnnotation.evalAfter };
      }
      return null;
    }
    const evalForMove = review.moveEvaluations.find(
      (e) => e.moveNumber === replayIndex
    );
    if (!evalForMove) {
      return null;
    }
    return evalForMove.isMate
      ? { type: "mate", value: evalForMove.mateIn ?? 0 }
      : { type: "cp", value: evalForMove.evalAfter };
  }, [replayIndex, review.moveEvaluations, currentAnnotation]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <main className="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        {/* Center: board column with eval bar (grows to fill height; board scales to fit) */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-full">
          <div className="flex w-full shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Engine
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center gap-2">
            <EvaluationBar
              evaluation={currentEvaluation}
              orientation="white"
              className="hidden h-full sm:block"
            />
            <div
              ref={boardContainerRef}
              className="flex aspect-square h-full max-w-full items-center justify-center"
            >
              <GameChessboard
                position={viewingFen}
                orientation="white"
                draggable={false}
                status="completed"
                gameId={game._id}
                customSquareStyles={undefined}
                boardWidth={boardSize}
              />
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-center rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            You
          </div>
          {review.moveEvaluations && review.moveEvaluations.length > 0 && (
            <EvaluationTimeline
              moveEvaluations={review.moveEvaluations}
              moveAnnotations={review.moveAnnotations}
              currentMoveNumber={replayIndex}
              onMoveClick={(moveNumber) => setReplayIndexAndUrl(moveNumber)}
              className="mt-2"
            />
          )}
        </div>

        {/* Right: review details + move history (move history grows to fill) */}
        <div className="flex min-h-0 w-full flex-1 flex-col gap-4 lg:w-auto lg:max-w-md">
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
          <MoveExplanationCard
            currentMove={currentMove ?? null}
            currentAnnotation={currentAnnotation}
            replayIndex={replayIndex}
            movesLength={moves.length}
            onNext={() =>
              setReplayIndexAndUrl((p) => Math.min(moves.length, p + 1))
            }
            onStart={() => setReplayIndexAndUrl(1)}
          />
          <MoveHistoryCard
            className="flex max-h-[50vh] min-h-0 flex-1 flex-col overflow-hidden lg:max-h-none"
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

        {/* Accuracy and evaluation timeline */}
        {review.moveAnnotations && review.moveAnnotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
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
              </div>
              {review.moveEvaluations && review.moveEvaluations.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    Game Flow
                  </p>
                  <EvaluationTimeline
                    moveEvaluations={review.moveEvaluations}
                    moveAnnotations={review.moveAnnotations}
                    currentMoveNumber={0}
                    onMoveClick={() => handleStartReview()}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Move quality breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Move Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {counts.brilliant > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-cyan-950">
                    !!
                  </span>
                  <span className="flex-1 text-sm">Brilliant</span>
                  <span className="font-medium text-cyan-500">
                    {counts.brilliant}
                  </span>
                </div>
              )}
              {counts.great > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-400 text-xs font-bold text-blue-950">
                    !
                  </span>
                  <span className="flex-1 text-sm">Great</span>
                  <span className="font-medium text-blue-500">
                    {counts.great}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-emerald-950">
                  ★
                </span>
                <span className="flex-1 text-sm">Best</span>
                <span className="font-medium text-emerald-500">
                  {counts.best}
                </span>
              </div>
              {counts.excellent > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-green-400 text-xs font-bold text-green-950">
                    ✓
                  </span>
                  <span className="flex-1 text-sm">Excellent</span>
                  <span className="font-medium text-green-500">
                    {counts.excellent}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                  •
                </span>
                <span className="flex-1 text-sm">Good</span>
                <span className="font-medium text-muted-foreground">
                  {counts.good}
                </span>
              </div>
              {counts.inaccuracy > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-yellow-950">
                    ?!
                  </span>
                  <span className="flex-1 text-sm">Inaccuracy</span>
                  <span className="font-medium text-yellow-600">
                    {counts.inaccuracy}
                  </span>
                </div>
              )}
              {counts.mistake > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-orange-950">
                    ?
                  </span>
                  <span className="flex-1 text-sm">Mistake</span>
                  <span className="font-medium text-orange-500">
                    {counts.mistake}
                  </span>
                </div>
              )}
              {counts.blunder > 0 && (
                <div className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-red-950">
                    ??
                  </span>
                  <span className="flex-1 text-sm">Blunder</span>
                  <span className="font-medium text-red-500">
                    {counts.blunder}
                  </span>
                </div>
              )}
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
