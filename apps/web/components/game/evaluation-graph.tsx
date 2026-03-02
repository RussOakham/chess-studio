"use client";

import { useMemo } from "react";

const CP_CLAMP = 500;

function cpToPercent(cp: number): number {
  const clamped = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, cp));
  return ((clamped + CP_CLAMP) / (2 * CP_CLAMP)) * 100;
}

interface EvaluationGraphProps {
  /** Evaluation in centipawns (White's perspective) per move: [start, after move 1, ...]. */
  evaluations: number[];
  /** Annotations in move order (same order as evaluations after start). */
  moveAnnotationsInOrder?: ({ type: string } | undefined)[] | null;
  /** Current replay index (0 = start, 1 = after first move, etc.). */
  replayIndex: number;
  className?: string;
}

/**
 * Horizontal evaluation-over-time graph with color-coded dots for key moves (blunder/mistake/good/best).
 */
export function EvaluationGraph({
  evaluations,
  moveAnnotationsInOrder,
  replayIndex,
  className,
}: EvaluationGraphProps) {
  const points = useMemo(() => {
    if (evaluations.length === 0) {
      return [];
    }
    return evaluations.map((cp, i) => ({
      x: (i / Math.max(1, evaluations.length - 1)) * 100,
      y: 100 - cpToPercent(cp),
      type: i >= 1 ? moveAnnotationsInOrder?.[i - 1]?.type : undefined,
    }));
  }, [evaluations, moveAnnotationsInOrder]);

  const pathD = useMemo(() => {
    if (points.length < 2) {
      return "";
    }
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  const currentX =
    evaluations.length > 1
      ? (replayIndex / Math.max(1, evaluations.length - 1)) * 100
      : 0;

  if (evaluations.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="h-16 w-full overflow-hidden rounded-md bg-muted/50">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
        >
          <defs>
            <linearGradient
              id="eval-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="hsl(var(--background))" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.3)" />
            </linearGradient>
          </defs>
          {/* Fill under the line */}
          {pathD && (
            <path
              d={`${pathD} L 100 100 L 0 100 Z`}
              fill="url(#eval-gradient)"
            />
          )}
          {/* Evaluation line */}
          <path
            d={pathD}
            fill="none"
            stroke="hsl(var(--foreground) / 0.8)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {/* Color-coded dots at key moves */}
          {points.map((p, i) => {
            if (i === 0 && evaluations.length > 1) {
              return null;
            }
            const dotColor =
              p.type === "blunder"
                ? "hsl(var(--destructive))"
                : p.type === "mistake"
                  ? "hsl(25 95% 53%)"
                  : p.type === "best" || p.type === "good"
                    ? "hsl(142 76% 36%)"
                    : null;
            if (!dotColor) {
              return null;
            }
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2"
                fill={dotColor}
                className="drop-shadow-sm"
              />
            );
          })}
          {/* Current position indicator */}
          {evaluations.length > 1 && (
            <line
              x1={currentX}
              y1={0}
              x2={currentX}
              y2={100}
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
