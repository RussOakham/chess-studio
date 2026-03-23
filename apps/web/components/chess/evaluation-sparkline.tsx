"use client";

import { cn } from "@/lib/utils";

const VIEW_WIDTH = 280;
const VIEW_HEIGHT = 40;
/** Centipawns; bar matches evaluation-bar mental model. */
const CP_RANGE = 500;

interface EvaluationSparklineProps {
  /** Centipawn eval after each half-move (same order as analysis). */
  centipawns: number[];
  className?: string;
}

/**
 * Compact advantage-over-time chart (Chess.com-style) from stored analysis evals.
 */
export function EvaluationSparkline({
  centipawns,
  className,
}: EvaluationSparklineProps) {
  if (centipawns.length < 2) {
    return null;
  }

  const pointCount = centipawns.length;
  const coords = centipawns.map((centipawn, index) => {
    const xCoord = (index / (pointCount - 1)) * VIEW_WIDTH;
    const clamped = Math.max(-CP_RANGE, Math.min(CP_RANGE, centipawn));
    const yCoord =
      VIEW_HEIGHT / 2 - (clamped / CP_RANGE) * (VIEW_HEIGHT / 2 - 2);
    return `${xCoord},${yCoord}`;
  });
  const pathD = `M ${coords[0]} L ${coords.slice(1).join(" L ")}`;

  return (
    <div
      className={cn("w-full", className)}
      role="img"
      aria-label="Evaluation over the game"
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-10 w-full text-chart-1"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={VIEW_HEIGHT / 2}
          x2={VIEW_WIDTH}
          y2={VIEW_HEIGHT / 2}
          className="stroke-border"
          strokeWidth="1"
        />
        <path
          d={pathD}
          fill="none"
          className="stroke-current"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
