"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ProgressNumbers {
  completed: number;
  total: number;
}

function percent({ completed, total }: ProgressNumbers): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, (completed / total) * 100));
}

/**
 * Thick circular ring that fills clockwise from 0% → 100% as analysis progresses.
 * Move counts are shown inside the ring.
 */
function CircularAnalysisProgress({
  completed,
  total,
  className,
  size = 168,
  strokeWidth = 9,
}: ProgressNumbers & {
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const pct = percent({ completed, total });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);
  const cx = size / 2;
  const cy = size / 2;
  const boxStyle = useMemo(() => ({ width: size, height: size }), [size]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
      style={boxStyle}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={`Analysis progress: ${String(completed)} of ${String(total)} moves`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${String(cx)} ${String(cy)})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
        <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {completed}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          of {total}
        </span>
        <span className="mt-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          moves
        </span>
      </div>
    </div>
  );
}

/** Horizontal bar for re-run / inline analysis progress. */
function AnalysisProgressBar({
  completed,
  total,
  className,
}: ProgressNumbers & { className?: string }) {
  const pct = percent({ completed, total });
  const barFillStyle = useMemo(() => ({ width: `${String(pct)}%` }), [pct]);

  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={barFillStyle}
      />
    </div>
  );
}

export { AnalysisProgressBar, CircularAnalysisProgress };
