import { review as reviewCopy } from "@/lib/copy";
import {
  formatBookMoveCaption,
  openingNameSuffix,
} from "@/lib/format-book-move-caption";
import type { MoveAnnotationType } from "@repo/chess";

interface MoveQualityCounts {
  good: number;
  best: number;
  book: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

function moveQualityCounts(
  moveAnnotations: { moveNumber: number; type: string }[] | undefined
): MoveQualityCounts {
  if (!moveAnnotations?.length) {
    return {
      good: 0,
      best: 0,
      book: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
    };
  }
  return {
    good: moveAnnotations.filter((ann) => ann.type === "good").length,
    best: moveAnnotations.filter((ann) => ann.type === "best").length,
    book: moveAnnotations.filter((ann) => ann.type === "book").length,
    inaccuracy: moveAnnotations.filter((ann) => ann.type === "inaccuracy")
      .length,
    mistake: moveAnnotations.filter((ann) => ann.type === "mistake").length,
    blunder: moveAnnotations.filter((ann) => ann.type === "blunder").length,
  };
}

function accuracyPercent(
  moveAnnotations: { type: string }[] | undefined
): number | null {
  if (!moveAnnotations?.length) {
    return null;
  }
  const goodOrBest = moveAnnotations.filter(
    (ann) => ann.type === "good" || ann.type === "best" || ann.type === "book"
  ).length;
  return Math.round((goodOrBest / moveAnnotations.length) * 1000) / 10;
}

/** Stored reviews may omit `evaluations` (older saves); re-analyze when missing or length ≠ ply count. */
function reviewNeedsEvaluationsRefresh(
  review: { evaluations?: number[] } | null | undefined,
  moveCount: number
): boolean {
  if (review === null || review === undefined || moveCount < 1) {
    return false;
  }
  const ev = review.evaluations;
  return !Array.isArray(ev) || ev.length !== moveCount;
}

function midReviewAnnotationCaption(annotation: {
  type: MoveAnnotationType;
  bestMoveSan?: string;
  bookOpeningEco?: string;
  bookOpeningName?: string;
}): string {
  const openingLine = openingNameSuffix(
    annotation.bookOpeningEco,
    annotation.bookOpeningName
  );
  switch (annotation.type) {
    case "best": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.bestWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.bestFallback) + openingLine
      );
    }
    case "good": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.goodWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.goodFallback) + openingLine
      );
    }
    case "inaccuracy": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.inaccuracyWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.inaccuracyFallback) + openingLine
      );
    }
    case "blunder": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.blunderWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.blunderFallback) + openingLine
      );
    }
    case "mistake": {
      return (
        (annotation.bestMoveSan
          ? reviewCopy.annotation.mistakeWithSan(annotation.bestMoveSan)
          : reviewCopy.annotation.mistakeFallback) + openingLine
      );
    }
    case "book": {
      return formatBookMoveCaption(
        annotation.bookOpeningEco,
        annotation.bookOpeningName
      );
    }
    default: {
      const exhaustive: never = annotation.type;
      return exhaustive;
    }
  }
}

export type { MoveQualityCounts };
export {
  accuracyPercent,
  midReviewAnnotationCaption,
  moveQualityCounts,
  reviewNeedsEvaluationsRefresh,
};
