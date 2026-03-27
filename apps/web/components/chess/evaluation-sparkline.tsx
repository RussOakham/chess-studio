"use client";

import {
  getAnnotationMarkerClassName,
  shouldShowTimelineMarker,
} from "@/lib/annotation-chart-styles";
import { a11y } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { MoveAnnotation } from "@repo/chess";
import { useCallback, useMemo, useRef } from "react";

const VIEW_WIDTH = 280;
const VIEW_HEIGHT = 64;
/** Centipawns; bar matches evaluation-bar mental model. */
const CP_RANGE = 500;

const MARKER_RADIUS = 3;

interface ChartPoint {
  xCoord: number;
  yCoord: number;
}

interface EvaluationSparklineProps {
  /** Centipawn eval after each half-move (same order as analysis). */
  centipawns: number[];
  className?: string;
  /** Move annotations; markers omit `good` per timeline marker policy. */
  moveAnnotations?: MoveAnnotation[] | null;
  /** Current replay step (0 = start). When omitted, no playhead. */
  replayIndex?: number;
  /** Max replay index (= move count). Defaults to `centipawns.length`. */
  moveCount?: number;
  /** Click chart to seek to this replay index. */
  onSeekReplayIndex?: (replayIndex: number) => void;
}

/**
 * `evaluations[i]` = eval after half-move `i + 1`. Chart x-index `i` matches `replayIndex === i + 1`
 * (and `replayIndex === 0` is start, playhead at left).
 */
function clampCp(cp: number): number {
  return Math.max(-CP_RANGE, Math.min(CP_RANGE, cp));
}

function yFromCp(clampedCp: number): number {
  return VIEW_HEIGHT / 2 - (clampedCp / CP_RANGE) * (VIEW_HEIGHT / 2 - 2);
}

function xFromPointIndex(index: number, pointCount: number): number {
  if (pointCount < 2) {
    return 0;
  }
  return (index / (pointCount - 1)) * VIEW_WIDTH;
}

/** Intersection x of segment (x0,y0)-(x1,y1) with horizontal y = yMid (if segment crosses). */
function midlineCrossX(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  yMid: number
): number | null {
  if (y0 === y1) {
    return null;
  }
  const above0 = y0 < yMid;
  const above1 = y1 < yMid;
  if (above0 === above1) {
    return null;
  }
  const lerpt = (yMid - y0) / (y1 - y0);
  return x0 + lerpt * (x1 - x0);
}

function appendAreaAbove(
  parts: string[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  yMid: number
): void {
  const above0 = y0 < yMid;
  const above1 = y1 < yMid;
  if (above0 && above1) {
    parts.push(`M ${x0} ${yMid} L ${x0} ${y0} L ${x1} ${y1} L ${x1} ${yMid} Z`);
  } else if (above0 && !above1) {
    const xCross = midlineCrossX(x0, y0, x1, y1, yMid);
    if (xCross !== null) {
      parts.push(`M ${x0} ${yMid} L ${x0} ${y0} L ${xCross} ${yMid} Z`);
    }
  } else if (!above0 && above1) {
    const xCross = midlineCrossX(x0, y0, x1, y1, yMid);
    if (xCross !== null) {
      parts.push(`M ${xCross} ${yMid} L ${x1} ${y1} L ${x1} ${yMid} Z`);
    }
  }
}

function appendAreaBelow(
  parts: string[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  yMid: number
): void {
  const below0 = y0 > yMid;
  const below1 = y1 > yMid;
  if (below0 && below1) {
    parts.push(`M ${x0} ${yMid} L ${x0} ${y0} L ${x1} ${y1} L ${x1} ${yMid} Z`);
  } else if (below0 && !below1) {
    const xCross = midlineCrossX(x0, y0, x1, y1, yMid);
    if (xCross !== null) {
      parts.push(`M ${x0} ${yMid} L ${x0} ${y0} L ${xCross} ${yMid} Z`);
    }
  } else if (!below0 && below1) {
    const xCross = midlineCrossX(x0, y0, x1, y1, yMid);
    if (xCross !== null) {
      parts.push(`M ${xCross} ${yMid} L ${x1} ${y1} L ${x1} ${yMid} Z`);
    }
  }
}

function playheadX(
  replayIndex: number,
  pointCount: number,
  maxReplay: number
): number {
  if (replayIndex <= 0 || pointCount < 2) {
    return 0;
  }
  if (replayIndex >= maxReplay) {
    return VIEW_WIDTH;
  }
  const chartIndex = Math.min(Math.max(replayIndex - 1, 0), pointCount - 1);
  return xFromPointIndex(chartIndex, pointCount);
}

function clickToReplayIndex(fraction: number, maxReplay: number): number {
  const clamped = Math.max(0, Math.min(1, fraction));
  return Math.round(clamped * maxReplay);
}

interface TimelineMarker {
  key: string;
  xCoord: number;
  yCoord: number;
  className: string;
}

function buildTimelineMarkers(
  moveAnnotations: MoveAnnotation[] | null | undefined,
  pointCount: number,
  chartPoints: ChartPoint[]
): TimelineMarker[] {
  if (!moveAnnotations?.length || pointCount < 1) {
    return [];
  }
  const result: TimelineMarker[] = [];
  for (const ann of moveAnnotations) {
    if (shouldShowTimelineMarker(ann.type)) {
      const pointIndex = ann.moveNumber - 1;
      if (pointIndex >= 0 && pointIndex < pointCount) {
        const chartPoint = chartPoints[pointIndex];
        if (chartPoint !== undefined) {
          result.push({
            xCoord: chartPoint.xCoord,
            yCoord: chartPoint.yCoord,
            className: getAnnotationMarkerClassName(ann.type),
            key: `${ann.moveNumber}-${ann.type}`,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Advantage-over-time chart from stored analysis: area fill, markers, optional playhead, click-to-seek.
 */
export function EvaluationSparkline({
  centipawns,
  className,
  moveAnnotations,
  replayIndex,
  moveCount: moveCountProp,
  onSeekReplayIndex,
}: EvaluationSparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const pointCount = centipawns.length;
  const maxReplay = moveCountProp ?? pointCount;

  const yMid = VIEW_HEIGHT / 2;

  const { linePathD, areaAboveD, areaBelowD, points } = useMemo(() => {
    if (pointCount < 2) {
      return {
        linePathD: "",
        areaAboveD: "",
        areaBelowD: "",
        points: [] as ChartPoint[],
      };
    }

    const chartPoints: ChartPoint[] = centipawns.map((centipawn, index) => {
      const xCoord = xFromPointIndex(index, pointCount);
      const clamped = clampCp(centipawn);
      const yCoord = yFromCp(clamped);
      return { xCoord, yCoord };
    });

    const coords = chartPoints.map((pt) => `${pt.xCoord},${pt.yCoord}`);
    const lineD = `M ${coords[0]} L ${coords.slice(1).join(" L ")}`;

    const aboveParts: string[] = [];
    const belowParts: string[] = [];
    for (
      let segmentIndex = 0;
      segmentIndex < chartPoints.length - 1;
      segmentIndex++
    ) {
      const startPt = chartPoints[segmentIndex];
      const endPt = chartPoints[segmentIndex + 1];
      if (startPt !== undefined && endPt !== undefined) {
        appendAreaAbove(
          aboveParts,
          startPt.xCoord,
          startPt.yCoord,
          endPt.xCoord,
          endPt.yCoord,
          yMid
        );
        appendAreaBelow(
          belowParts,
          startPt.xCoord,
          startPt.yCoord,
          endPt.xCoord,
          endPt.yCoord,
          yMid
        );
      }
    }

    return {
      linePathD: lineD,
      areaAboveD: aboveParts.join(" "),
      areaBelowD: belowParts.join(" "),
      points: chartPoints,
    };
  }, [centipawns, pointCount, yMid]);

  const markers = useMemo(
    () => buildTimelineMarkers(moveAnnotations, pointCount, points),
    [moveAnnotations, pointCount, points]
  );

  const showPlayhead =
    replayIndex !== undefined && maxReplay > 0 && pointCount >= 2;
  const playheadLineX = showPlayhead
    ? playheadX(replayIndex, pointCount, maxReplay)
    : null;

  const handlePointer = useCallback(
    (clientX: number) => {
      if (!onSeekReplayIndex || maxReplay < 1) {
        return;
      }
      const el = svgRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const fraction = (clientX - rect.left) / rect.width;
      onSeekReplayIndex(clickToReplayIndex(fraction, maxReplay));
    },
    [maxReplay, onSeekReplayIndex]
  );

  const ariaLabel = useMemo(() => {
    if (replayIndex === undefined) {
      return a11y.sparkline.overGame;
    }
    return a11y.sparkline.withStep(replayIndex, maxReplay);
  }, [replayIndex, maxReplay]);

  if (pointCount < 2) {
    return null;
  }

  const chartSvg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={cn(
        "h-16 min-h-16 w-full touch-manipulation",
        /* `text-chart-1` + `stroke-current` matches pre-refactor sparkline; `stroke-chart-1` alone may not resolve on `<path>` in all Tailwind setups */
        "text-chart-1"
      )}
      preserveAspectRatio="none"
    >
      <line
        x1="0"
        y1={yMid}
        x2={VIEW_WIDTH}
        y2={yMid}
        className="stroke-border"
        strokeWidth="1"
      />
      {areaBelowD ? (
        <path d={areaBelowD} className="fill-destructive/15" stroke="none" />
      ) : null}
      {areaAboveD ? (
        <path d={areaAboveD} className="fill-primary/15" stroke="none" />
      ) : null}
      <path
        d={linePathD}
        fill="none"
        className="stroke-current"
        strokeWidth="1.5"
      />
      {markers.map((marker) => (
        <circle
          key={marker.key}
          cx={marker.xCoord}
          cy={marker.yCoord}
          r={MARKER_RADIUS}
          className={cn("fill-current", marker.className)}
        />
      ))}
      {playheadLineX !== null ? (
        <line
          x1={playheadLineX}
          y1="0"
          x2={playheadLineX}
          y2={VIEW_HEIGHT}
          className="stroke-destructive"
          strokeWidth="1.5"
        />
      ) : null}
    </svg>
  );

  return (
    <div className={cn("w-full shrink-0", className)}>
      {onSeekReplayIndex ? (
        <button
          type="button"
          className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left text-chart-1"
          aria-label={`${ariaLabel}. Click or tap to seek; ArrowLeft and ArrowRight to step; Home and End for start and end.`}
          onPointerUp={(event) => {
            if (event.button !== 0) {
              return;
            }
            handlePointer(event.clientX);
          }}
          onKeyDown={(event) => {
            const current = replayIndex ?? 0;
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onSeekReplayIndex(Math.max(0, current - 1));
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              onSeekReplayIndex(Math.min(maxReplay, current + 1));
            } else if (event.key === "Home") {
              event.preventDefault();
              onSeekReplayIndex(0);
            } else if (event.key === "End") {
              event.preventDefault();
              onSeekReplayIndex(maxReplay);
            }
          }}
        >
          {chartSvg}
        </button>
      ) : (
        <div role="img" aria-label={ariaLabel}>
          {chartSvg}
        </div>
      )}
    </div>
  );
}
