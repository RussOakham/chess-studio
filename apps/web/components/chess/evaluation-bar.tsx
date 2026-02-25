"use client";

import type { PositionEvaluation } from "@repo/chess";
import { useMemo } from "react";

const CP_CLAMP = 500;

/**
 * Converts a position evaluation to a 0–100 percent (0 = Black winning, 100 = White winning).
 */
function evaluationToPercent(evaluation: PositionEvaluation): number {
  if (evaluation.type === "mate") {
    return evaluation.value > 0 ? 100 : 0;
  }
  const clamped = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, evaluation.value));
  return ((clamped + CP_CLAMP) / (2 * CP_CLAMP)) * 100;
}

/**
 * Formats evaluation for display (e.g. "+1.5", "-M2").
 */
function formatEvalLabel(evaluation: PositionEvaluation): string {
  if (evaluation.type === "mate") {
    return evaluation.value > 0
      ? `M${evaluation.value}`
      : `-M${Math.abs(evaluation.value)}`;
  }
  const pawns = evaluation.value / 100;
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/**
 * Returns an accessible label for the evaluation (screen readers).
 */
function getAriaLabel(evaluation: PositionEvaluation): string {
  if (evaluation.type === "mate") {
    if (evaluation.value > 0) {
      return `Mate in ${evaluation.value} for white`;
    }
    return `Mate in ${Math.abs(evaluation.value)} for black`;
  }
  const pawns = evaluation.value / 100;
  if (evaluation.value === 0) {
    return "Evaluation: 0.0 — equal position";
  }
  const favour = evaluation.value > 0 ? "white" : "black";
  return `Evaluation: ${pawns > 0 ? "+" : ""}${pawns.toFixed(1)} in favour of ${favour}`;
}

/** Props for the vertical evaluation bar component. */
interface EvaluationBarProps {
  evaluation: PositionEvaluation | null;
  orientation: "white" | "black";
  className?: string;
}

/** Vertical evaluation bar: bottom = white advantage when orientation is white, flipped for black. */
export function EvaluationBar({
  evaluation,
  orientation,
  className,
}: EvaluationBarProps) {
  const percent = evaluation ? evaluationToPercent(evaluation) : 50;
  const displayPercent = orientation === "black" ? 100 - percent : percent;
  const label = evaluation ? formatEvalLabel(evaluation) : "—";
  const ariaLabel = evaluation
    ? getAriaLabel(evaluation)
    : "Evaluation loading";

  const whiteStyle = useMemo(
    () => ({ height: `${displayPercent}%` }),
    [displayPercent]
  );
  const blackStyle = useMemo(
    () => ({ height: `${100 - displayPercent}%` }),
    [displayPercent]
  );

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      <div className="flex h-full min-h-[200px] w-6 flex-col rounded-md border border-border bg-muted">
        <div
          className="w-full rounded-t-md bg-zinc-800 transition-[height] duration-150 dark:bg-zinc-700"
          style={blackStyle}
        />
        <div
          className="w-full rounded-b-md bg-white transition-[height] duration-150 dark:bg-white/90"
          style={whiteStyle}
        />
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground" aria-hidden>
        {label}
      </p>
    </div>
  );
}
