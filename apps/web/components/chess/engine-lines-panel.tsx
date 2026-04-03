"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { engineLinesCopy } from "@/lib/copy/engine-lines";
import {
  engineLineEvalPillClassName,
  formatEngineLineEvaluation,
  uciPvToSanPrefix,
} from "@/lib/engine-lines-display";
import { cn } from "@/lib/utils";
import type { EngineLine } from "@repo/chess";
import { ENGINE_LINES_DEFAULT_DEPTH } from "@repo/chess";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const DEBOUNCE_MS = 150;
const MAX_PLIES_DISPLAY = 10;
const MAX_SAN_LENGTH = 72;

interface EngineLinesPanelProps {
  fen: string;
  isStockfishReady: boolean;
  /** True while the shared worker is doing something that must finish first (e.g. engine move). */
  blockAnalysis: boolean;
  getEngineLines: (
    fen: string,
    opts?: { depth?: number; multipv?: number }
  ) => Promise<EngineLine[] | null>;
  abortEngineLines: () => void;
  variant: "review" | "live";
  liveEnabled?: boolean;
  onLiveEnabledChange?: (enabled: boolean) => void;
}

function truncateSan(text: string): { short: string; full: string } {
  const full = text.trim();
  if (full.length <= MAX_SAN_LENGTH) {
    return { short: full, full };
  }
  return {
    short: `${full.slice(0, MAX_SAN_LENGTH)}${engineLinesCopy.lineTruncatedSuffix}`,
    full,
  };
}

export function EngineLinesPanel({
  fen,
  isStockfishReady,
  blockAnalysis,
  getEngineLines,
  abortEngineLines,
  variant,
  liveEnabled = false,
  onLiveEnabledChange,
}: EngineLinesPanelProps) {
  const analysisActive = variant === "review" || liveEnabled;
  const [lines, setLines] = useState<EngineLine[] | null>(null);
  /** FEN the current `lines` were computed for; avoids showing PV+SAN against a newer `fen`. */
  const [linesFen, setLinesFen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);
  const [depthShown, setDepthShown] = useState<number | null>(null);

  useEffect(() => {
    if (!analysisActive || !isStockfishReady || blockAnalysis) {
      setLines(null);
      setLinesFen(null);
      setLoading(false);
      setLinesError(null);
      setDepthShown(null);
      return;
    }

    // New FEN: clear immediately so we never render the previous PV against the new
    // position (UCI would be illegal and chess.js can throw).
    setLines(null);
    setLinesFen(null);
    setLinesError(null);
    setDepthShown(null);
    setLoading(true);

    let cancelled = false;

    const debounceTimer = setTimeout(() => {
      setLinesError(null);

      void (async () => {
        try {
          const result = await getEngineLines(fen, {
            depth: ENGINE_LINES_DEFAULT_DEPTH,
            multipv: 3,
          });
          if (cancelled) {
            return;
          }
          setLines(result ?? []);
          setLinesFen(fen);
          setDepthShown(ENGINE_LINES_DEFAULT_DEPTH);
        } catch (error) {
          if (!cancelled) {
            setLinesError(
              error instanceof Error
                ? error.message
                : engineLinesCopy.errorGeneric
            );
            setLines(null);
            setLinesFen(null);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      abortEngineLines();
    };
  }, [
    fen,
    analysisActive,
    isStockfishReady,
    blockAnalysis,
    getEngineLines,
    abortEngineLines,
  ]);

  const showPanelBody = analysisActive && isStockfishReady;

  const renderAnalysisContent = (): ReactNode => {
    if (blockAnalysis) {
      return (
        <p className="py-4 text-sm text-muted-foreground">
          {engineLinesCopy.engineBusy}
        </p>
      );
    }
    if (loading) {
      return (
        <div
          className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
          aria-busy
          aria-live="polite"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {engineLinesCopy.loading}
        </div>
      );
    }
    if (linesError !== null) {
      return (
        <p className="py-3 text-sm text-destructive" role="alert">
          {linesError}
        </p>
      );
    }
    if (lines !== null && lines.length === 0) {
      return (
        <p className="py-3 text-sm text-muted-foreground">
          {engineLinesCopy.emptyPosition}
        </p>
      );
    }
    if (lines !== null && linesFen !== fen) {
      return (
        <div
          className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
          aria-busy
          aria-live="polite"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {engineLinesCopy.loading}
        </div>
      );
    }
    return (
      <ul className="divide-y divide-border">
        {(lines ?? []).map((line) => {
          const sanRaw = uciPvToSanPrefix(
            fen,
            line.movesUci,
            MAX_PLIES_DISPLAY
          );
          const { short, full } = truncateSan(sanRaw);
          const evalText = formatEngineLineEvaluation(line.evaluation);
          return (
            <li key={line.multipv} className="flex gap-2 py-2 first:pt-3">
              <div
                className={cn(
                  "flex w-14 shrink-0 items-center justify-center rounded-md border px-1 py-1.5 font-mono text-xs font-medium tabular-nums",
                  engineLineEvalPillClassName(line.evaluation)
                )}
                title={evalText}
              >
                {evalText}
              </div>
              <p
                className="min-w-0 flex-1 truncate font-mono text-xs leading-snug text-foreground md:text-sm"
                title={full.length > short.length ? full : short}
              >
                {short}
              </p>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <Card className="shrink-0 border-border bg-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {variant === "live" ? (
            <div className="flex items-center gap-2">
              <input
                id="engine-lines-live-toggle"
                type="checkbox"
                checked={liveEnabled}
                onChange={(event) => {
                  onLiveEnabledChange?.(event.target.checked);
                }}
                className="size-4 rounded border border-input accent-primary"
                aria-label={engineLinesCopy.liveToggleAria}
              />
              <Label
                htmlFor="engine-lines-live-toggle"
                className="cursor-pointer text-sm leading-none font-medium"
              >
                {engineLinesCopy.liveToggleLabel}
              </Label>
            </div>
          ) : (
            <span className="text-sm font-semibold tracking-tight">
              {engineLinesCopy.title}
            </span>
          )}
        </div>
        {showPanelBody && depthShown !== null && !loading && !linesError ? (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {engineLinesCopy.headerMeta(depthShown)}
          </span>
        ) : null}
      </CardHeader>

      {showPanelBody ? (
        <CardContent className="space-y-0 border-t border-border pt-0 pb-3">
          {renderAnalysisContent()}
        </CardContent>
      ) : null}
    </Card>
  );
}
