"use client";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { EvaluationSparkline } from "@/components/chess/evaluation-sparkline";
import { AnalysisProgressBar } from "@/components/review/review-analysis-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Doc } from "@/convex/_generated/dataModel";
import { review as reviewCopy } from "@/lib/copy";
import type { MoveQualityCounts } from "@/lib/review-page-helpers";
import type { MoveAnnotation } from "@repo/chess";
import { Loader2 } from "lucide-react";
import type { CSSProperties } from "react";

export interface ReviewOverviewProps {
  moves: Doc<"moves">[];
  review: Doc<"game_reviews">;
  /** From Lichess name and/or PGN; empty means hide opening line. */
  openingLabel: string | null | undefined;
  isAnalyzing: boolean;
  progress: { completed: number; total: number } | null;
  userAccuracy: number | null;
  counts: MoveQualityCounts;
  accuracyBarStyle: CSSProperties;
  onStartReview: () => void;
  onEvaluationSeek: (index: number) => void;
  onRerunAnalysis: () => Promise<void>;
  aiSummaryPending: boolean;
  aiSummaryError: string | null;
  aiSummaryNotice: string | null;
  onAiSummaryAction: (regenerate: boolean) => Promise<void>;
}

export function ReviewOverview({
  moves,
  review,
  openingLabel,
  isAnalyzing,
  progress,
  userAccuracy,
  counts,
  accuracyBarStyle,
  onStartReview,
  onEvaluationSeek,
  onRerunAnalysis,
  aiSummaryPending,
  aiSummaryError,
  aiSummaryNotice,
  onAiSummaryAction,
}: ReviewOverviewProps) {
  return (
    <div className="min-h-full bg-background p-4 md:p-6" data-game-surface="">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {reviewCopy.title}
          </h1>
          {openingLabel ? (
            <p className="text-sm text-muted-foreground">
              {reviewCopy.openingPrefix(openingLabel)}
            </p>
          ) : null}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-2xl leading-none">
                ♔
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {isAnalyzing ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {reviewCopy.coachAnalyzing}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {progress
                        ? reviewCopy.coachProgress(
                            progress.completed,
                            progress.total
                          )
                        : reviewCopy.coachStarting}
                    </p>
                    <AnalysisProgressBar
                      completed={progress?.completed ?? 0}
                      total={progress?.total ?? Math.max(1, moves.length)}
                    />
                  </>
                ) : (
                  <p className="text-sm text-foreground">{review.summary}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {!isAnalyzing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {reviewCopy.aiSummary.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {reviewCopy.aiSummary.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {review.aiSummary?.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11"
                    disabled={aiSummaryPending}
                    onClick={() => {
                      void onAiSummaryAction(true);
                    }}
                  >
                    {aiSummaryPending ? (
                      <>
                        <Loader2
                          aria-hidden
                          className="mr-2 size-4 shrink-0 animate-spin"
                        />
                        {reviewCopy.aiSummary.generating}
                      </>
                    ) : (
                      reviewCopy.aiSummary.regenerate
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-11"
                    disabled={aiSummaryPending}
                    onClick={() => {
                      void onAiSummaryAction(false);
                    }}
                  >
                    {aiSummaryPending ? (
                      <>
                        <Loader2
                          aria-hidden
                          className="mr-2 size-4 shrink-0 animate-spin"
                        />
                        {reviewCopy.aiSummary.generating}
                      </>
                    ) : (
                      reviewCopy.aiSummary.generate
                    )}
                  </Button>
                )}
              </div>
              {aiSummaryNotice !== null ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {aiSummaryNotice}
                </p>
              ) : null}
              {aiSummaryError !== null ? (
                <p className="text-sm text-destructive" role="alert">
                  {aiSummaryError}
                </p>
              ) : null}
              {review.aiSummary?.trim() ? (
                <Message from="assistant">
                  <MessageContent className="max-w-none">
                    <MessageResponse>{review.aiSummary.trim()}</MessageResponse>
                  </MessageContent>
                </Message>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {review.evaluations && review.evaluations.length >= 2 ? (
          <Card className="animate-in fade-in-0 fill-mode-both slide-in-from-bottom-2 motion-safe:duration-300 motion-reduce:animate-none">
            <CardHeader>
              <CardTitle className="text-base">
                {reviewCopy.advantageOverTime}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EvaluationSparkline
                centipawns={review.evaluations}
                moveAnnotations={
                  (review.moveAnnotations ?? undefined) as
                    | MoveAnnotation[]
                    | undefined
                }
                moveCount={moves.length}
                onSeekReplayIndex={onEvaluationSeek}
              />
            </CardContent>
          </Card>
        ) : null}

        {review.moveAnnotations && review.moveAnnotations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{reviewCopy.accuracy}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-md bg-primary transition-all"
                  style={accuracyBarStyle}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {reviewCopy.yourAccuracy(userAccuracy ?? 0)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {reviewCopy.moveQuality}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-muted-foreground">
                  {reviewCopy.you}
                </p>
                <p className="text-2xl font-semibold text-primary">
                  {userAccuracy ?? "—"}%
                </p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    {reviewCopy.countLabels.best}: {counts.best}
                  </li>
                  <li>
                    {reviewCopy.countLabels.good}: {counts.good}
                  </li>
                  <li>
                    {reviewCopy.countLabels.book}: {counts.book}
                  </li>
                  <li>
                    {reviewCopy.countLabels.inaccuracy}: {counts.inaccuracy}
                  </li>
                  <li>
                    {reviewCopy.countLabels.mistake}: {counts.mistake}
                  </li>
                  <li>
                    {reviewCopy.countLabels.blunder}: {counts.blunder}
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">
                  {reviewCopy.engine}
                </p>
                <p className="text-2xl font-semibold">—</p>
                <p className="mt-2 text-muted-foreground">
                  {reviewCopy.engineMovesNotRated}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid w-full min-w-0 grid-cols-2 gap-3">
          <Button
            size="lg"
            className="min-h-11 w-full min-w-0 shrink text-center whitespace-normal"
            onClick={onStartReview}
            disabled={isAnalyzing}
          >
            {reviewCopy.startReview}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="min-h-11 w-full min-w-0 shrink text-center whitespace-normal"
            disabled={isAnalyzing}
            onClick={() => {
              void onRerunAnalysis();
            }}
          >
            {reviewCopy.rerunAnalysis}
          </Button>
        </div>
      </div>
    </div>
  );
}
