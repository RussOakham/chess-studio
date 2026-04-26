"use client";

import type { PositionEvaluation } from "@repo/chess";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 250;

/**
 * Debounced engine evaluation for an arbitrary FEN (e.g. review replay, start position).
 * Use when `useEvaluationSync` does not apply (not limited to in-progress games).
 */
export function useEvaluationForFen(
  fen: string | undefined,
  enabled: boolean,
  isStockfishReady: boolean,
  getEvaluation: (fen: string) => Promise<PositionEvaluation>
): PositionEvaluation | null {
  const [evaluation, setEvaluation] = useState<PositionEvaluation | null>(null);
  const evaluationFenRef = useRef<string | null>(null);
  const getEvaluationRef = useRef(getEvaluation);
  getEvaluationRef.current = getEvaluation;

  useEffect(() => {
    if (!enabled || !isStockfishReady || !fen) {
      setEvaluation(null);
      return;
    }
    const timeoutId = setTimeout(() => {
      const requestedFen = fen;
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
    // eslint-disable-next-line @typescript-eslint/consistent-return -- React effects may return cleanup fns
    return () => clearTimeout(timeoutId);
  }, [fen, enabled, isStockfishReady]);

  return evaluation;
}
