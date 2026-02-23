"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { memo } from "react";

interface MoveHistoryItem {
  id: string;
  displayNumber?: number;
  isWhiteMove: boolean;
  moveSan: string;
}

interface MoveHistoryCardProps {
  sortedMovesLength: number;
  replayIndex: number;
  setReplayIndex: (value: number | ((prev: number) => number)) => void;
  moveHistory: MoveHistoryItem[];
}

const moveItemStyle = {
  contentVisibility: "auto" as const,
  containIntrinsicSize: "0 2.5rem",
};

function MoveHistoryCardComponent({
  sortedMovesLength,
  replayIndex,
  setReplayIndex,
  moveHistory,
}: MoveHistoryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Move History</CardTitle>
        <CardDescription>
          {sortedMovesLength === 0
            ? "No moves yet"
            : `${sortedMovesLength} move${sortedMovesLength === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedMovesLength > 0 ? (
          <div className="flex flex-wrap gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex(0)}
            >
              Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === 0}
              onClick={() => setReplayIndex((prev) => Math.max(0, prev - 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === sortedMovesLength}
              onClick={() =>
                setReplayIndex((prev) => Math.min(sortedMovesLength, prev + 1))
              }
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={replayIndex === sortedMovesLength}
              onClick={() => setReplayIndex(sortedMovesLength)}
            >
              End
            </Button>
          </div>
        ) : null}
        {sortedMovesLength === 0 ? (
          <p className="text-sm text-muted-foreground">
            Move history will appear here as you play
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {moveHistory.map((move, idx) => {
              const isCurrent = replayIndex > 0 && replayIndex === idx + 1;
              const isLive =
                replayIndex === sortedMovesLength &&
                idx === moveHistory.length - 1;
              const highlighted = isCurrent || isLive;
              return (
                <button
                  key={move.id}
                  type="button"
                  className={`flex w-full cursor-pointer items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted ${
                    highlighted ? "bg-primary/10 ring-1 ring-primary/30" : ""
                  }`}
                  style={moveItemStyle}
                  onClick={() => setReplayIndex(idx + 1)}
                >
                  {move.displayNumber != null ? (
                    <span className="font-medium text-muted-foreground">
                      {move.displayNumber}.
                    </span>
                  ) : null}
                  <span
                    className={
                      move.isWhiteMove ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {move.moveSan}
                  </span>
                  {isLive ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      (live)
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const MoveHistoryCard = memo(MoveHistoryCardComponent);
export type { MoveHistoryItem };
