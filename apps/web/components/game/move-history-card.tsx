"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React, { memo, useMemo } from "react";

type MoveAnnotationType = "blunder" | "mistake" | "good" | "best";

export interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
}

interface MoveHistoryItem {
  id: string;
  displayNumber?: number;
  isWhiteMove: boolean;
  moveSan: string;
  moveNumber?: number;
}

interface MoveHistoryCardProps {
  sortedMovesLength: number;
  replayIndex: number;
  setReplayIndex: (value: number | ((prev: number) => number)) => void;
  moveHistory: MoveHistoryItem[];
  moveAnnotations?: MoveAnnotation[] | null;
  /** Optional class for the card container (e.g. flex-1 min-h-0 to fill space) */
  className?: string;
}

const moveItemStyle = {
  contentVisibility: "auto" as const,
  containIntrinsicSize: "0 2.5rem",
};

function annotationBadge(type: MoveAnnotationType): string {
  switch (type) {
    case "blunder": {
      return "??";
    }
    case "mistake": {
      return "?";
    }
    case "best": {
      return "!!";
    }
    default: {
      return "";
    }
  }
}

function getAnnotationBadgeClassName(
  type: MoveAnnotationType | undefined
): string {
  if (type === "blunder") {
    return "font-medium text-destructive";
  }
  if (type === "mistake") {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-primary";
}

function MoveHistoryCardComponent({
  sortedMovesLength,
  replayIndex,
  setReplayIndex,
  moveHistory,
  moveAnnotations,
  className,
}: MoveHistoryCardProps) {
  const annotationByMoveNumber = useMemo(() => {
    if (!moveAnnotations?.length) {
      return new Map<number, MoveAnnotation>();
    }
    const annotationMap = new Map<number, MoveAnnotation>();
    for (const annotation of moveAnnotations) {
      annotationMap.set(annotation.moveNumber, annotation);
    }
    return annotationMap;
  }, [moveAnnotations]);

  return (
    <Card className={className}>
      <CardHeader className="shrink-0">
        <CardTitle>Move History</CardTitle>
        <CardDescription>
          {sortedMovesLength === 0
            ? "No moves yet"
            : `${sortedMovesLength} move${sortedMovesLength === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col space-y-3">
        {sortedMovesLength > 0 ? (
          <div className="grid shrink-0 grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="default"
              className="w-full"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex(0)}
            >
              Start
            </Button>
            <Button
              variant="outline"
              size="default"
              className="w-full"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="default"
              className="w-full"
              disabled={replayIndex === sortedMovesLength}
              onClick={() =>
                setReplayIndex((prev) => Math.min(sortedMovesLength, prev + 1))
              }
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="default"
              className="w-full"
              disabled={replayIndex === sortedMovesLength}
              onClick={() => setReplayIndex(sortedMovesLength)}
            >
              End
            </Button>
          </div>
        ) : null}
        {sortedMovesLength === 0 ? (
          <p className="text-sm text-muted-foreground">
            Move history will appear here as you play
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-[minmax(2rem,auto)_1fr_1fr] gap-x-2 gap-y-0.5 text-sm">
              <div className="py-2 font-medium text-muted-foreground" />
              <div className="py-2 font-medium text-muted-foreground">
                White
              </div>
              <div className="py-2 font-medium text-muted-foreground">
                Black
              </div>
              {Array.from(
                { length: Math.ceil(moveHistory.length / 2) },
                (_, rowIndex) => {
                  const whiteIdx = 2 * rowIndex;
                  const blackIdx = 2 * rowIndex + 1;
                  const whiteMove = moveHistory[whiteIdx];
                  const blackMove = moveHistory[blackIdx];
                  const whiteReplayIdx = whiteIdx + 1;
                  const blackReplayIdx = blackIdx + 1;
                  const whiteHighlighted =
                    replayIndex === whiteReplayIdx ||
                    (replayIndex === sortedMovesLength &&
                      whiteIdx === moveHistory.length - 1);
                  const blackHighlighted =
                    replayIndex === blackReplayIdx ||
                    (replayIndex === sortedMovesLength &&
                      blackIdx === moveHistory.length - 1);
                  const whiteAnnotation =
                    whiteMove?.moveNumber != null
                      ? annotationByMoveNumber.get(whiteMove.moveNumber)
                      : undefined;
                  const blackAnnotation =
                    blackMove?.moveNumber != null
                      ? annotationByMoveNumber.get(blackMove.moveNumber)
                      : undefined;
                  const whiteBadge = whiteAnnotation
                    ? annotationBadge(whiteAnnotation.type)
                    : null;
                  const blackBadge = blackAnnotation
                    ? annotationBadge(blackAnnotation.type)
                    : null;
                  const whiteTooltip =
                    whiteAnnotation &&
                    (whiteAnnotation.type === "blunder" ||
                      whiteAnnotation.type === "mistake") &&
                    whiteAnnotation.bestMoveSan
                      ? `Best move: ${whiteAnnotation.bestMoveSan}`
                      : undefined;
                  const blackTooltip =
                    blackAnnotation &&
                    (blackAnnotation.type === "blunder" ||
                      blackAnnotation.type === "mistake") &&
                    blackAnnotation.bestMoveSan
                      ? `Best move: ${blackAnnotation.bestMoveSan}`
                      : undefined;
                  return (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div className="flex items-center py-1.5 font-medium text-muted-foreground">
                        {rowIndex + 1}.
                      </div>
                      <button
                        type="button"
                        title={whiteTooltip}
                        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-left hover:bg-muted ${
                          whiteHighlighted
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : ""
                        }`}
                        style={moveItemStyle}
                        onClick={() => setReplayIndex(whiteReplayIdx)}
                      >
                        <span className="font-medium">
                          {whiteMove?.moveSan}
                        </span>
                        {whiteBadge ? (
                          <span
                            className={getAnnotationBadgeClassName(
                              whiteAnnotation?.type
                            )}
                          >
                            {whiteBadge}
                          </span>
                        ) : null}
                      </button>
                      <button
                        key={`row-${rowIndex}-black`}
                        type="button"
                        title={blackTooltip}
                        disabled={!blackMove}
                        className={`flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground ${
                          blackHighlighted
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : ""
                        }${!blackMove ? " cursor-default" : ""}`}
                        style={moveItemStyle}
                        onClick={
                          blackMove
                            ? () => setReplayIndex(blackReplayIdx)
                            : undefined
                        }
                      >
                        {blackMove ? (
                          <>
                            <span>{blackMove.moveSan}</span>
                            {blackBadge ? (
                              <span
                                className={getAnnotationBadgeClassName(
                                  blackAnnotation?.type
                                )}
                              >
                                {blackBadge}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </button>
                    </React.Fragment>
                  );
                }
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MoveHistoryCard = memo(MoveHistoryCardComponent);

export { MoveHistoryCard };
export type { MoveAnnotationType, MoveHistoryItem };
