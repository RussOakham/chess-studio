"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { memo, useMemo } from "react";

type MoveAnnotationType = "blunder" | "mistake" | "good" | "best";

interface MoveAnnotation {
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
    <Card>
      <CardHeader>
        <CardTitle>Move History</CardTitle>
        <CardDescription>
          {sortedMovesLength === 0
            ? "No moves yet"
            : `${sortedMovesLength} move${sortedMovesLength === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedMovesLength > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex(0)}
            >
              Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === sortedMovesLength}
              onClick={() =>
                setReplayIndex((prev) => Math.min(sortedMovesLength, prev + 1))
              }
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
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
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {moveHistory.map((move, idx) => {
              const isCurrent = replayIndex > 0 && replayIndex === idx + 1;
              const isLive =
                replayIndex === sortedMovesLength &&
                idx === moveHistory.length - 1;
              const highlighted = isCurrent || isLive;
              const annotation =
                move.moveNumber != null
                  ? annotationByMoveNumber.get(move.moveNumber)
                  : undefined;
              const badge = annotation
                ? annotationBadge(annotation.type)
                : null;
              const tooltipText =
                annotation &&
                (annotation.type === "blunder" ||
                  annotation.type === "mistake") &&
                annotation.bestMoveSan
                  ? `Best move: ${annotation.bestMoveSan}`
                  : undefined;

              const row = (
                <button
                  key={move.id}
                  type="button"
                  title={tooltipText}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted ${
                    highlighted ? "bg-primary/10 ring-1 ring-primary/30" : ""
                  }`}
                  style={moveItemStyle}
                  onClick={() => setReplayIndex(idx + 1)}
                >
                  {move.displayNumber != null ? (
                    <span className="font-medium text-muted-foreground">
                      {move.displayNumber}.
                    </span>
                  ) : null}
                  <span
                    className={
                      move.isWhiteMove ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {move.moveSan}
                  </span>
                  {badge ? (
                    <span
                      className={getAnnotationBadgeClassName(annotation?.type)}
                    >
                      {badge}
                    </span>
                  ) : null}
                  {isLive ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      (live)
                    </span>
                  ) : null}
                </button>
              );

              return row;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MoveHistoryCard = memo(MoveHistoryCardComponent);

export { MoveHistoryCard };
export type { MoveAnnotationType, MoveHistoryItem };
