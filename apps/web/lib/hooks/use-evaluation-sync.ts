"use client";

import type { PositionEvaluation } from "@repo/chess";

import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 250;

/**
 * Syncs position evaluation from the engine to local state with debounce.
 * Only runs when game is in progress and Stockfish is ready.
 */
export function useEvaluationSync(
  gameFen: string | undefined,
  gameStatus: string | undefined,
  isStockfishReady: boolean,
  getEvaluation: (fen: string) => Promise<PositionEvaluation>
): PositionEvaluation | null {
  const [evaluation, setEvaluation] = useState<PositionEvaluation | null>(null);
  const evaluationFenRef = useRef<string | null>(null);
  const getEvaluationRef = useRef(getEvaluation);
  getEvaluationRef.current = getEvaluation;

  useEffect(() => {
    if (gameStatus !== "in_progress" || !isStockfishReady) {
      return;
    }
    const timeoutId = setTimeout(() => {
      const requestedFen = gameFen ?? "";
      evaluationFenRef.current = requestedFen;
      void (async () => {
        try {
          const ev = await getEvaluationRef.current(requestedFen);
          if (evaluationFenRef.current === requestedFen) {
            setEvaluation(ev);
          }
        } catch {
          if (evaluationFenRef.current === requestedFen) {
            setEvaluation(null);
          }
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
    // Omit isCalculating to avoid loop: getEvaluation sets it, so deps would retrigger effect
    // eslint-disable-next-line react-hooks/exhaustive-deps -- gameFen, gameStatus, isStockfishReady
  }, [gameFen, gameStatus, isStockfishReady]);

  return evaluation;
}
