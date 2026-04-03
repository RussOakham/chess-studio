"use client";

import type { BoardArrow } from "@/components/chess/chessboard";
import { EngineLinesPanel } from "@/components/chess/engine-lines-panel";
import { EvaluationBar } from "@/components/chess/evaluation-bar";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { shouldShowTimelineMarker } from "@/lib/annotation-chart-styles";
import { capturedToSymbols, getCapturedPieces } from "@/lib/captured-pieces";
import { game as gameCopy, review as reviewCopy } from "@/lib/copy";
import { useBoardContainerSize } from "@/lib/hooks/use-board-container-size";
import { useEvaluationForFen } from "@/lib/hooks/use-evaluation-for-fen";
import { useReplay } from "@/lib/hooks/use-replay";
import {
  buildReviewBoardArrows,
  uciToFromTo,
} from "@/lib/review-board-overlays";
import { evaluationForReplayIndex } from "@/lib/review-evaluation";
import { midReviewAnnotationCaption } from "@/lib/review-page-helpers";
import type {
  EngineLine,
  GameDifficulty,
  MoveAnnotation,
  PositionEvaluation,
} from "@repo/chess";
import { Bot, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";

const EMPTY_REVIEW_BOARD_ARROWS: BoardArrow[] = [];

export interface ReviewMidReviewProps {
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

export function ReviewMidReview({
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
