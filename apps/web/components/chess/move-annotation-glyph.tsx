"use client";

import { moveAnnotationTextGlyph } from "@/lib/move-annotation-glyph";
import { cn } from "@/lib/utils";
import type { MoveAnnotationType } from "@repo/chess";
import { BookOpen } from "lucide-react";

interface MoveAnnotationGlyphProps {
  type: MoveAnnotationType;
  /** Classes for text glyphs; book icon uses `text-current` and optional `className`. */
  className?: string;
  /**
   * When set (e.g. board overlay badge), book icon scales with this pixel size.
   * Omit for inline use (move list, headers).
   */
  bookIconSizePx?: number;
}

/**
 * Shared glyphs for move quality: punctuation for engine classes, open-book icon for
 * Lichess explorer book moves.
 */
function MoveAnnotationGlyph({
  type,
  className,
  bookIconSizePx,
}: MoveAnnotationGlyphProps) {
  if (type === "book") {
    if (bookIconSizePx !== undefined) {
      const iconPx = Math.max(11, Math.round(bookIconSizePx * 0.42));
      return (
        <BookOpen
          width={iconPx}
          height={iconPx}
          className="shrink-0 text-white"
          strokeWidth={2.5}
          aria-hidden
        />
      );
    }
    return (
      <BookOpen
        className={cn(
          "inline-block shrink-0 align-[-0.125em] text-current",
          className ?? "size-3.5"
        )}
        strokeWidth={2.25}
        aria-label="Book"
      />
    );
  }

  return <span className={className}>{moveAnnotationTextGlyph(type)}</span>;
}

export type { MoveAnnotationGlyphProps };
export { MoveAnnotationGlyph };
