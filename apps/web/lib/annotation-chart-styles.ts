import type { MoveAnnotationType } from "@repo/chess";

/**
 * Tailwind classes for SVG markers (fill via currentColor on `<circle>`).
 * Aligns with move-history badge colors in `move-history-card.tsx`.
 */
function getAnnotationMarkerClassName(type: MoveAnnotationType): string {
  switch (type) {
    case "blunder": {
      return "text-destructive";
    }
    case "mistake": {
      return "text-amber-600 dark:text-amber-400";
    }
    case "inaccuracy": {
      return "text-orange-600 dark:text-orange-400";
    }
    case "good":
    case "best": {
      return "text-primary";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

/** Per plan: omit dots for plain "good" moves; show best + inaccuracy + mistake + blunder. */
function shouldShowTimelineMarker(type: MoveAnnotationType): boolean {
  return type !== "good";
}

export { getAnnotationMarkerClassName, shouldShowTimelineMarker };
