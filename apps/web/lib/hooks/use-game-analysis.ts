"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { LICHESS_EXPLORER_MAX_FENS_PER_BATCH } from "@/lib/lichess/lichess-explorer-batch";
import { parseExplorerMastersResponse } from "@/lib/lichess/parse-explorer-response";
import type { ExplorerMastersResponse } from "@/lib/lichess/types";
import type {
  AnalysisMove,
  GameAnalysisResult,
  GameForAnalysis,
} from "@/lib/run-game-analysis";
import { runGameAnalysis } from "@/lib/run-game-analysis";
import type { PositionEvaluation } from "@repo/chess";
import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";

type GetEvaluation = (fen: string) => Promise<PositionEvaluation>;
type GetBestMove = (
  fen: string,
  difficulty: "easy" | "medium" | "hard"
) => Promise<{ from: string; to: string; promotion?: string; uci: string }>;

interface UseGameAnalysisOptions {
  gameId: string;
  game: GameForAnalysis | null | undefined;
  moves: AnalysisMove[];
  getEvaluation: GetEvaluation;
  getBestMove: GetBestMove;
}

interface GameAnalysisState {
  isAnalyzing: boolean;
  progress: { completed: number; total: number } | null;
  error: string | null;
}

export function useGameAnalysis({
  gameId,
  game,
  moves,
  getEvaluation,
  getBestMove,
}: UseGameAnalysisOptions) {
  const saveReview = useMutation(api.reviews.save);
  const batchExplorerMasters = useAction(
    api.lichess_explorer.batchExplorerMasters
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getExplorerBatch = useCallback(
    async (fens: string[]) => {
      const map = new Map<string, ExplorerMastersResponse | null>();
      if (fens.length === 0) {
        return map;
      }
      for (
        let offset = 0;
        offset < fens.length;
        offset += LICHESS_EXPLORER_MAX_FENS_PER_BATCH
      ) {
        const chunk = fens.slice(
          offset,
          offset + LICHESS_EXPLORER_MAX_FENS_PER_BATCH
        );
        const entries = await batchExplorerMasters({ fens: chunk });
        for (const entry of entries) {
          if (entry.payloadJson === null) {
            map.set(entry.cacheKey, null);
          } else {
            try {
              const parsed = parseExplorerMastersResponse(
                JSON.parse(entry.payloadJson) as unknown
              );
              map.set(entry.cacheKey, parsed);
            } catch {
              map.set(entry.cacheKey, null);
            }
          }
        }
      }
      return map;
    },
    [batchExplorerMasters]
  );

  const runAnalysis = useCallback(async () => {
    if (game?.status !== "completed" || moves.length === 0) {
      setError("Game is not completed or has no moves");
      return;
    }

    setIsAnalyzing(true);
    setProgress({ completed: 0, total: moves.length });
    setError(null);

    try {
      const result: GameAnalysisResult = await runGameAnalysis(
        game,
        moves,
        getEvaluation,
        getBestMove,
        (completed, total) => {
          setProgress({ completed, total });
        },
        getExplorerBatch
      );

      await saveReview({
        gameId: toGameId(gameId),
        summary: result.summary,
        evaluations: result.evaluations,
        keyMoments: result.keyMoments,
        suggestions: result.suggestions,
        moveAnnotations: result.moveAnnotations,
        openingNameLichess: result.openingNameLichess ?? undefined,
      });
    } catch (gameAnalysisError: unknown) {
      const message =
        gameAnalysisError instanceof Error
          ? gameAnalysisError.message
          : "Analysis failed";
      setError(message);
    } finally {
      setIsAnalyzing(false);
      setProgress(null);
    }
  }, [
    game,
    gameId,
    moves,
    getEvaluation,
    getBestMove,
    getExplorerBatch,
    saveReview,
  ]);

  return {
    runAnalysis,
    isAnalyzing,
    progress,
    error,
  };
}

export type { GameAnalysisState, UseGameAnalysisOptions };
