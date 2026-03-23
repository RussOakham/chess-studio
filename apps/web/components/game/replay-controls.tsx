"use client";

import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const AUTOPLAY_MS = 750;

const replayControlsButtonClass = "min-h-9 min-w-0 flex-1 gap-1 px-1.5 sm:px-2";

interface ReplayControlsProps {
  sortedMovesLength: number;
  replayIndex: number;
  setReplayIndex: (value: number | ((prev: number) => number)) => void;
  /** When false, Start/Prev/Next/End are hidden (no moves yet). */
  hasMoves: boolean;
}

/**
 * Playback controls for game replay: jump, step, autoplay.
 */
export function ReplayControls({
  sortedMovesLength,
  replayIndex,
  setReplayIndex,
  hasMoves,
}: ReplayControlsProps) {
  const [playing, setPlaying] = useState(false);

  const atEnd = replayIndex >= sortedMovesLength;
  const atStart = replayIndex === 0;

  useEffect(() => {
    if (playing && replayIndex >= sortedMovesLength && sortedMovesLength > 0) {
      setPlaying(false);
    }
  }, [playing, replayIndex, sortedMovesLength]);

  useEffect(() => {
    if (!playing || sortedMovesLength === 0) {
      return;
    }
    const id = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= sortedMovesLength) {
          return prev;
        }
        return Math.min(sortedMovesLength, prev + 1);
      });
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [playing, sortedMovesLength, setReplayIndex]);

  const stopPlaying = useCallback(() => {
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (sortedMovesLength === 0) {
      return;
    }
    if (replayIndex >= sortedMovesLength) {
      setReplayIndex(0);
      setPlaying(true);
      return;
    }
    setPlaying((wasPlaying) => !wasPlaying);
  }, [replayIndex, sortedMovesLength, setReplayIndex]);

  if (!hasMoves) {
    return null;
  }

  return (
    <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-card pt-2 pb-1">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={replayControlsButtonClass}
          disabled={atStart}
          onClick={() => {
            stopPlaying();
            setReplayIndex(0);
          }}
          aria-label="Jump to start"
        >
          <span className="hidden sm:inline">Start</span>
          <span className="sm:hidden">|&lt;</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={replayControlsButtonClass}
          disabled={atStart}
          onClick={() => {
            stopPlaying();
            setReplayIndex((prev) => Math.max(0, prev - 1));
          }}
          aria-label="Previous move"
        >
          Prev
        </Button>
        <Button
          type="button"
          variant={playing ? "secondary" : "default"}
          size="sm"
          className={replayControlsButtonClass}
          disabled={sortedMovesLength === 0}
          onClick={() => {
            togglePlay();
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause className="size-4 shrink-0" />
          ) : (
            <Play className="size-4 shrink-0" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={replayControlsButtonClass}
          disabled={atEnd}
          onClick={() => {
            stopPlaying();
            setReplayIndex((prev) => Math.min(sortedMovesLength, prev + 1));
          }}
          aria-label="Next move"
        >
          Next
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={replayControlsButtonClass}
          disabled={atEnd}
          onClick={() => {
            stopPlaying();
            setReplayIndex(sortedMovesLength);
          }}
          aria-label="Jump to end"
        >
          <span className="hidden sm:inline">End</span>
          <span className="sm:hidden">&gt;|</span>
        </Button>
      </div>
    </div>
  );
}
