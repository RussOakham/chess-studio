"use client";

import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

const DEFAULT_MIN_SIDE = 200;
const DEFAULT_INSET = 32;

/**
 * Size the chessboard to the square that fits inside `containerRef` (from
 * ResizeObserver), matching game and review pages.
 */
export function useBoardContainerSize(
  containerRef: RefObject<HTMLElement | null>,
  options?: { minSide?: number; inset?: number }
): number {
  const minSide = options?.minSide ?? DEFAULT_MIN_SIDE;
  const inset = options?.inset ?? DEFAULT_INSET;
  const [boardSize, setBoardSize] = useState(560);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    function updateSize() {
      if (!el) {
        return;
      }
      const width = el.clientWidth;
      const height = el.clientHeight;
      const side = Math.min(width, height);
      setBoardSize(Math.max(minSide, side - inset));
    }
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, minSide, inset]);

  return boardSize;
}
