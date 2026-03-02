"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { memo, useMemo } from "react";

type MoveAnnotationType =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder";

export interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
  evalBefore?: number;
  evalAfter?: number;
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
    case "brilliant": {
      return "!!";
    }
    case "great": {
      return "!";
    }
    case "best": {
      return "";
    }
    case "excellent": {
      return "";
    }
    case "good": {
      return "";
    }
    case "book": {
      return "";
    }
    case "inaccuracy": {
      return "?!";
    }
    case "mistake": {
      return "?";
    }
    case "miss": {
      return "?";
    }
    case "blunder": {
      return "??";
    }
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

interface AnnotationIconConfig {
  bgColor: string;
  textColor: string;
  symbol: string;
}

function getAnnotationIconConfig(
  type: MoveAnnotationType
): AnnotationIconConfig | null {
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
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

function getAnnotationBadgeClassName(
  type: MoveAnnotationType | undefined
): string {
  if (!type) {
    return "";
  }
  switch (type) {
    case "brilliant": {
      return "text-cyan-500 dark:text-cyan-400 font-bold";
    }
    case "great": {
      return "text-blue-500 dark:text-blue-400 font-medium";
    }
    case "best": {
      return "text-emerald-500 dark:text-emerald-400";
    }
    case "excellent": {
      return "text-green-500 dark:text-green-400";
    }
    case "good": {
      return "text-muted-foreground";
    }
    case "book": {
      return "text-amber-500 dark:text-amber-400";
    }
    case "inaccuracy": {
      return "text-yellow-600 dark:text-yellow-400";
    }
    case "mistake": {
      return "text-orange-500 dark:text-orange-400 font-medium";
    }
    case "miss": {
      return "text-orange-600 dark:text-orange-400 font-medium";
    }
    case "blunder": {
      return "text-red-500 dark:text-red-400 font-bold";
    }
    default: {
      const exhaustiveCheck: never = type;
      return exhaustiveCheck;
    }
  }
}

function getMoveTooltip(
  annotation: MoveAnnotation | undefined
): string | undefined {
  if (!annotation) {
    return undefined;
  }
  const isBadMove =
    annotation.type === "blunder" ||
    annotation.type === "mistake" ||
    annotation.type === "inaccuracy";
  if (isBadMove && annotation.bestMoveSan) {
    return `Best move: ${annotation.bestMoveSan}`;
  }
  return annotation.type;
}

function AnnotationIcon({ type }: { type: MoveAnnotationType }) {
  const config = getAnnotationIconConfig(type);
  if (!config) {
    return null;
  }
  return (
    <span
      className={cn(
        "inline-flex size-5 items-center justify-center rounded-full text-[10px] leading-none font-bold",
        config.bgColor,
        config.textColor
      )}
    >
      {config.symbol}
    </span>
  );
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
                  const whiteTooltip = getMoveTooltip(whiteAnnotation);
                  const blackTooltip = getMoveTooltip(blackAnnotation);
                  return (
                    <React.Fragment key={`row-${rowIndex}`}>
                      <div className="flex items-center py-1.5 font-medium text-muted-foreground">
                        {rowIndex + 1}.
                      </div>
                      <button
                        type="button"
                        title={whiteTooltip}
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-left hover:bg-muted",
                          whiteHighlighted &&
                            "bg-primary/10 ring-1 ring-primary/30"
                        )}
                        style={moveItemStyle}
                        onClick={() => setReplayIndex(whiteReplayIdx)}
                      >
                        {whiteAnnotation && (
                          <AnnotationIcon type={whiteAnnotation.type} />
                        )}
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
                        className={cn(
                          "flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground",
                          blackHighlighted &&
                            "bg-primary/10 ring-1 ring-primary/30",
                          !blackMove && "cursor-default"
                        )}
                        style={moveItemStyle}
                        onClick={
                          blackMove
                            ? () => setReplayIndex(blackReplayIdx)
                            : undefined
                        }
                      >
                        {blackMove ? (
                          <>
                            {blackAnnotation && (
                              <AnnotationIcon type={blackAnnotation.type} />
                            )}
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
