"use client";

import type { DifficultyLevel } from "@repo/chess";
import { useCallback, useEffect, useState, startTransition } from "react";

interface HintMove {
  from: string;
  to: string;
  promotion?: string;
}

type GetBestMove = (
  fen: string,
  difficulty: DifficultyLevel
) => Promise<{ from: string; to: string; promotion?: string }>;

function useHint(options: {
  fen: string | undefined;
  difficulty: DifficultyLevel | undefined;
  getBestMove: GetBestMove;
  enabled: boolean;
}) {
  const { fen, difficulty, getBestMove, enabled } = options;
  const [hint, setHint] = useState<HintMove | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  useEffect(() => {
    setHint(null);
  }, [fen, enabled]);

  const clearHint = useCallback(() => {
    setHint(null);
  }, []);

  const requestHint = useCallback(async () => {
    if (!fen || !difficulty || !enabled || isHintLoading) {
      return;
    }
    setIsHintLoading(true);
    setHint(null);
    try {
      const result = await getBestMove(fen, difficulty);
      startTransition(() => {
        setHint({
          from: result.from,
          to: result.to,
          promotion: result.promotion,
        });
        setIsHintLoading(false);
      });
    } catch (error) {
      console.error("Hint request failed:", error);
      startTransition(() => {
        setHint(null);
        setIsHintLoading(false);
      });
    }
  }, [fen, difficulty, enabled, getBestMove, isHintLoading]);

  return {
    hint,
    requestHint,
    clearHint,
    isHintLoading,
  };
}

export type { HintMove };
export { useHint };
