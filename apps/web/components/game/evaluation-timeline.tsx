"use client";

import { cn } from "@/lib/utils";
import { memo, useMemo } from "react";

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

interface MoveEvaluation {
  moveNumber: number;
  evalAfter: number;
  isMate?: boolean;
  mateIn?: number;
}

interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
}

interface EvaluationTimelineProps {
  moveEvaluations: MoveEvaluation[];
  moveAnnotations?: MoveAnnotation[];
  currentMoveNumber: number;
  onMoveClick?: (moveNumber: number) => void;
  className?: string;
}

const CP_CLAMP = 500;

function evalToPercent(evalCp: number, isMate?: boolean): number {
  if (isMate) {
    return evalCp > 0 ? 100 : 0;
  }
  const clamped = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, evalCp));
  return ((clamped + CP_CLAMP) / (2 * CP_CLAMP)) * 100;
}

function getAnnotationColor(type: MoveAnnotationType): string {
  switch (type) {
    case "brilliant": {
      return "bg-cyan-400";
    }
    case "great": {
      return "bg-blue-400";
    }
    case "best": {
      return "bg-emerald-400";
    }
    case "excellent": {
      return "bg-green-400";
    }
    case "good": {
      return "bg-green-300";
    }
    case "book": {
      return "bg-amber-300";
    }
    case "inaccuracy": {
      return "bg-yellow-400";
    }
    case "mistake": {
      return "bg-orange-400";
    }
    case "miss": {
      return "bg-orange-500";
    }
    case "blunder": {
      return "bg-red-500";
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function shouldShowDot(type: MoveAnnotationType): boolean {
  return ["brilliant", "great", "blunder", "mistake", "inaccuracy"].includes(
    type
  );
}

function EvaluationTimelineComponent({
  moveEvaluations,
  moveAnnotations,
  currentMoveNumber,
  onMoveClick,
  className,
}: EvaluationTimelineProps) {
  const annotationByMoveNumber = useMemo(() => {
    if (!moveAnnotations?.length) {
      return new Map<number, MoveAnnotation>();
    }
    const map = new Map<number, MoveAnnotation>();
    for (const ann of moveAnnotations) {
      map.set(ann.moveNumber, ann);
    }
    return map;
  }, [moveAnnotations]);

  const points = useMemo(() => {
    if (!moveEvaluations.length) {
      return [];
    }
    return moveEvaluations.map((ev) => ({
      moveNumber: ev.moveNumber,
      percent: evalToPercent(ev.evalAfter, ev.isMate),
      annotation: annotationByMoveNumber.get(ev.moveNumber),
    }));
  }, [moveEvaluations, annotationByMoveNumber]);

  const pathD = useMemo(() => {
    if (points.length === 0) {
      return "";
    }
    const svgWidth = 100;
    const svgHeight = 100;
    const stepX = svgWidth / Math.max(1, points.length - 1);

    return points
      .map((point, index) => {
        const posX = index * stepX;
        const posY = svgHeight - (point.percent / 100) * svgHeight;
        return index === 0 ? `M ${posX} ${posY}` : `L ${posX} ${posY}`;
      })
      .join(" ");
  }, [points]);

  if (points.length === 0) {
    return null;
  }

  const width = 100;
  const height = 100;
  const stepX = width / Math.max(1, points.length - 1);
  const currentX =
    currentMoveNumber > 0 ? (currentMoveNumber - 1) * stepX : undefined;

  return (
    <div className={cn("relative w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-16 w-full"
      >
        <rect
          x="0"
          y="0"
          width={width}
          height={height / 2}
          className="fill-zinc-800 dark:fill-zinc-700"
        />
        <rect
          x="0"
          y={height / 2}
          width={width}
          height={height / 2}
          className="fill-white dark:fill-white/90"
        />
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          className="stroke-border"
          strokeWidth="0.5"
        />
        <path
          d={pathD}
          fill="none"
          className="stroke-primary"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {currentX !== undefined && (
          <line
            x1={currentX}
            y1="0"
            x2={currentX}
            y2={height}
            className="stroke-primary/50"
            strokeWidth="1"
            strokeDasharray="2,2"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex h-16 items-end">
        {points.map((point, index) => {
          const { annotation } = point;
          if (!annotation || !shouldShowDot(annotation.type)) {
            return null;
          }
          const leftPercent = (index / Math.max(1, points.length - 1)) * 100;
          const bottomPercent = point.percent;
          return (
            <button
              key={point.moveNumber}
              type="button"
              className={cn(
                "pointer-events-auto absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border border-background shadow-sm transition-transform hover:scale-125",
                getAnnotationColor(annotation.type),
                currentMoveNumber === point.moveNumber &&
                  "scale-125 ring-2 ring-primary"
              )}
              style={{
                left: `${leftPercent}%`,
                bottom: `${bottomPercent}%`,
              }}
              onClick={() => onMoveClick?.(point.moveNumber)}
              title={`Move ${point.moveNumber}: ${annotation.type}`}
            />
          );
        })}
      </div>
      {onMoveClick && (
        <div
          role="slider"
          tabIndex={0}
          aria-label="Evaluation timeline - click or use arrow keys to navigate moves"
          aria-valuemin={1}
          aria-valuemax={points.length}
          aria-valuenow={currentMoveNumber}
          className="absolute inset-0 h-16 cursor-pointer"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const percent = clickX / rect.width;
            const moveIndex = Math.round(percent * (points.length - 1));
            const point = points[moveIndex];
            if (point) {
              onMoveClick(point.moveNumber);
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key === "ArrowRight" &&
              currentMoveNumber < points.length
            ) {
              onMoveClick(currentMoveNumber + 1);
            } else if (event.key === "ArrowLeft" && currentMoveNumber > 1) {
              onMoveClick(currentMoveNumber - 1);
            }
          }}
        />
      )}
    </div>
  );
}

const EvaluationTimeline = memo(EvaluationTimelineComponent);

export { EvaluationTimeline };
export type { MoveAnnotation, MoveAnnotationType, MoveEvaluation };
