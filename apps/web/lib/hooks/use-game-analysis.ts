"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import type {
  AnalysisMove,
  GameAnalysisResult,
  GameForAnalysis,
} from "@/lib/run-game-analysis";
import { runGameAnalysis } from "@/lib/run-game-analysis";
import type { PositionEvaluation } from "@repo/chess";
import { useMutation } from "convex/react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        }
      );

      await saveReview({
        gameId: toGameId(gameId),
        summary: result.summary,
        keyMoments: result.keyMoments,
        suggestions: result.suggestions,
        moveAnnotations: result.moveAnnotations,
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
  }, [game, gameId, moves, getEvaluation, getBestMove, saveReview]);

  return {
    runAnalysis,
    isAnalyzing,
    progress,
    error,
  };
}

export type { GameAnalysisState, UseGameAnalysisOptions };
