"use client";

import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { game as gameCopy } from "@/lib/copy";

export function GamePostGameCard({
  openingLabel,
  review,
  isAnalyzing,
  progress,
  reviewUrl,
  onNewGame,
}: {
  openingLabel: string | null | undefined;
  review: Doc<"game_reviews"> | null | undefined;
  isAnalyzing: boolean;
  progress: { completed: number; total: number } | null;
  reviewUrl: string;
  onNewGame: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{gameCopy.postGame.playBotsTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
            ♔
          </div>
          <div className="min-w-0 flex-1 rounded-lg rounded-tl-none bg-muted/50 px-3 py-2 text-sm text-foreground">
            {gameCopy.postGame.botMessage}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {openingLabel
            ? gameCopy.postGame.openingPrefix(openingLabel)
            : gameCopy.postGame.completeReviewAvailable}
        </p>
        {review?.moveAnnotations && review.moveAnnotations.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {(() => {
              const good = review.moveAnnotations.filter(
                (ann) => ann.type === "good"
              ).length;
              const best = review.moveAnnotations.filter(
                (ann) => ann.type === "best"
              ).length;
              const inaccuracy = review.moveAnnotations.filter(
                (ann) => ann.type === "inaccuracy"
              ).length;
              return (
                <>
                  {good > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="text-primary">!</span>
                      {gameCopy.postGame.statGood(good)}
                    </span>
                  )}
                  {best > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="text-primary">★</span>
                      {gameCopy.postGame.statBest(best)}
                    </span>
                  )}
                  {inaccuracy > 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="text-orange-600 dark:text-orange-400">
                        ?!
                      </span>
                      {gameCopy.postGame.statInaccuracy(inaccuracy)}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}
        {isAnalyzing && (
          <p className="text-sm text-muted-foreground">
            {gameCopy.postGame.analyzing}
            {progress &&
              gameCopy.postGame.analyzingProgress(
                progress.completed,
                progress.total
              )}
          </p>
        )}
        <a
          href={reviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonVariants({ size: "lg" })} inline-flex w-full`}
          aria-label={gameCopy.postGame.reviewNewTabAria}
        >
          {gameCopy.postGame.reviewCta}
        </a>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onNewGame}>
            {gameCopy.postGame.newGame}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onNewGame}>
            {gameCopy.postGame.rematch}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
