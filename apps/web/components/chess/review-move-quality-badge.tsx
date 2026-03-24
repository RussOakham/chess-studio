"use client";

import { MoveAnnotationGlyph } from "@/components/chess/move-annotation-glyph";
import { squareToRelativeRect } from "@/lib/chess-square-layout";
import { cn } from "@/lib/utils";
import type { MoveAnnotationType } from "@repo/chess";
import { useMemo } from "react";

/** Base size on smaller boards; scales up ~30–50% on larger boards (matches bigger squares). */
const BADGE_BASE_PX = 22;

function badgeSizeForBoardWidth(boardWidthPx: number): number {
  if (boardWidthPx < 480) {
    return BADGE_BASE_PX;
  }
  if (boardWidthPx < 600) {
    return 29; // ~32% larger
  }
  return 33; // ~50% larger
}

function badgePillClassName(type: MoveAnnotationType): string {
  switch (type) {
    case "blunder": {
      return "bg-destructive text-destructive-foreground";
    }
    case "mistake": {
      return "bg-amber-600 text-white dark:bg-amber-500";
    }
    case "inaccuracy": {
      return "bg-orange-600 text-white dark:bg-orange-500";
    }
    case "good": {
      return "bg-primary text-primary-foreground";
    }
    case "best": {
      return "bg-primary text-primary-foreground";
    }
    case "book": {
      return "bg-emerald-700 text-white dark:bg-emerald-600";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

interface ReviewMoveQualityBadgeProps {
  boardWidthPx: number;
  square: string;
  orientation: "white" | "black";
  annotationType: MoveAnnotationType;
  className?: string;
}

/**
 * Chess.com-style circular glyph on the top-right of the destination square.
 */
function ReviewMoveQualityBadge({
  boardWidthPx,
  square,
  orientation,
  annotationType,
  className,
}: ReviewMoveQualityBadgeProps) {
  const rect = squareToRelativeRect(square, orientation);
  if (rect === null || boardWidthPx < 16) {
    return null;
  }

  const { left, top, width } = rect;
  const badgeSizePx = badgeSizeForBoardWidth(boardWidthPx);
  const cornerInsetPx = badgeSizePx > BADGE_BASE_PX ? 4 : 3;
  const rightEdge = (left + width) * boardWidthPx;
  const topEdge = top * boardWidthPx;
  const leftPx = rightEdge - badgeSizePx - cornerInsetPx;
  const topPx = topEdge + cornerInsetPx;
  const fontSizePx = Math.max(
    10,
    Math.min(15, Math.round((badgeSizePx * 10) / BADGE_BASE_PX))
  );

  const layoutStyle = useMemo(
    () => ({
      left: leftPx,
      top: topPx,
      width: badgeSizePx,
      height: badgeSizePx,
      minWidth: badgeSizePx,
      minHeight: badgeSizePx,
      fontSize: fontSizePx,
    }),
    [badgeSizePx, fontSizePx, leftPx, topPx]
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute flex items-center justify-center rounded-full px-1 leading-none font-semibold tabular-nums",
        // Layered shadow + subtle rim + top highlight for depth on the board
        "shadow-[0_2px_4px_rgba(0,0,0,0.28),0_6px_14px_-2px_rgba(0,0,0,0.32)]",
        "ring-1 ring-black/15 dark:ring-black/40",
        "dark:shadow-[0_2px_5px_rgba(0,0,0,0.45),0_8px_18px_-2px_rgba(0,0,0,0.55)]",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] before:content-['']",
        badgePillClassName(annotationType),
        className
      )}
      style={layoutStyle}
      aria-hidden
    >
      <MoveAnnotationGlyph bookIconSizePx={badgeSizePx} type={annotationType} />
    </div>
  );
}

export type { ReviewMoveQualityBadgeProps };
export { ReviewMoveQualityBadge };
