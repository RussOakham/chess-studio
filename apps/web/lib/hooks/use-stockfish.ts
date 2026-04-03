"use client";

import type {
  EngineLine,
  GameDifficulty,
  PositionEvaluation,
  StockfishInstance,
} from "@repo/chess";
import {
  ENGINE_LINES_DEFAULT_DEPTH,
  calculateBestMove,
  getEngineDepth,
  getPositionEvaluation,
  getTopEngineLines,
  sendUciStop,
} from "@repo/chess";
import { useCallback, useEffect, useRef, useState } from "react";

function wrapStockfishWorker(worker: Worker): StockfishInstance {
  const messageListenerWrappers = new Map<
    (event: MessageEvent<string>) => void,
    (event: MessageEvent) => void
  >();

  return {
    postMessage: (message: string) => {
      // eslint-disable-next-line unicorn/require-post-message-target-origin
      worker.postMessage(message);
    },
    addEventListener: (
      _type: "message",
      listener: (event: MessageEvent<string>) => void
    ) => {
      const wrapped = (event: MessageEvent) => {
        if (event instanceof MessageEvent && typeof event.data === "string") {
          listener(event as MessageEvent<string>);
        }
      };
      messageListenerWrappers.set(listener, wrapped);
      worker.addEventListener("message", wrapped);
    },
    removeEventListener: (
      _type: "message",
      listener: (event: MessageEvent<string>) => void
    ) => {
      const wrapped = messageListenerWrappers.get(listener);
      if (wrapped !== undefined) {
        worker.removeEventListener("message", wrapped);
        messageListenerWrappers.delete(listener);
      }
    },
    terminate: () => {
      worker.terminate();
    },
  };
}

/**
 * Hook for using Stockfish engine in the browser
 * Calculates best moves client-side using Web Workers
 * Uses native Worker API with files from /public/engine/
 *
 * **Two workers:** main (best move / eval bar) and a dedicated analysis worker (MultiPV)
 * so rapid `stop`/`go` and MultiPV traffic do not share one WASM instance (avoids crashes).
 */
export function useStockfish() {
  const [isReady, setIsReady] = useState(false);
  const [isAnalysisEngineReady, setIsAnalysisEngineReady] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  /** Mirrors {@link isCalculating} for guards without stale closures. */
  const isCalculatingRef = useRef(false);
  const stockfishRef = useRef<StockfishInstance | null>(null);
  const analysisStockfishRef = useRef<StockfishInstance | null>(null);
  /** Serializes MultiPV on the analysis worker only. */
  const isAnalysisBusyRef = useRef(false);
  /** Invalidates in-flight {@link getEngineLines} when incremented (FEN change / unmount). */
  const engineLinesRequestIdRef = useRef(0);

  const setCalculating = (next: boolean) => {
    isCalculatingRef.current = next;
    setIsCalculating(next);
  };

  useEffect(() => {
    if (typeof globalThis === "undefined" || typeof Worker === "undefined") {
      return;
    }

    let isMounted = true;
    let mainWorker: Worker | null = null;
    let analysisWorker: Worker | null = null;

    try {
      mainWorker = new Worker("/engine/stockfish.js", {
        type: "module",
      });
      const mainWrapper = wrapStockfishWorker(mainWorker);

      analysisWorker = new Worker("/engine/stockfish.js", {
        type: "module",
      });
      const analysisWrapper = wrapStockfishWorker(analysisWorker);

      if (isMounted) {
        stockfishRef.current = mainWrapper;
        analysisStockfishRef.current = analysisWrapper;
        setIsReady(true);
        setIsAnalysisEngineReady(true);
      }
    } catch (error) {
      analysisWorker?.terminate();
      mainWorker?.terminate();
      console.error("Failed to initialize Stockfish:", error);
    }

    return () => {
      isMounted = false;
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
      if (analysisStockfishRef.current) {
        analysisStockfishRef.current.terminate();
        analysisStockfishRef.current = null;
      }
      setIsReady(false);
      setIsAnalysisEngineReady(false);
    };
  }, []);

  /**
   * Calculate best move using Stockfish
   */
  const getBestMove = async (
    fen: string,
    difficulty: GameDifficulty
  ): Promise<{
    from: string;
    to: string;
    promotion?: string;
    uci: string;
  }> => {
    if (!stockfishRef.current) {
      throw new Error("Stockfish not initialized");
    }

    if (isCalculatingRef.current) {
      throw new Error("Stockfish is already calculating");
    }

    setCalculating(true);

    try {
      const depth = getEngineDepth(difficulty);
      const bestMoveUci = await calculateBestMove(
        fen,
        depth,
        stockfishRef.current
      );

      const from = bestMoveUci.slice(0, 2) ?? "";
      const to = bestMoveUci.slice(2, 4) ?? "";
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

      return {
        from,
        to,
        promotion:
          promotion === "q" ||
          promotion === "r" ||
          promotion === "b" ||
          promotion === "n"
            ? promotion
            : undefined,
        uci: bestMoveUci,
      };
    } finally {
      setCalculating(false);
    }
  };

  /**
   * Get position evaluation (centipawns or mate) from Stockfish.
   * Sets isCalculating for the duration to prevent races with getBestMove.
   */
  const getEvaluation = async (fen: string): Promise<PositionEvaluation> => {
    if (!stockfishRef.current) {
      throw new Error("Stockfish not initialized");
    }
    if (isCalculatingRef.current) {
      throw new Error("Stockfish is already calculating");
    }
    setCalculating(true);
    try {
      return await getPositionEvaluation(fen, stockfishRef.current);
    } finally {
      setCalculating(false);
    }
  };

  /**
   * MultiPV “top lines” on a **dedicated analysis worker** (does not set `isCalculating`).
   */
  const getEngineLines = useCallback(
    async (
      fen: string,
      opts?: { depth?: number; multipv?: number }
    ): Promise<EngineLine[] | null> => {
      const sf = analysisStockfishRef.current;
      if (!sf) {
        throw new Error("Analysis Stockfish not initialized");
      }
      if (isAnalysisBusyRef.current) {
        throw new Error("Analysis engine is busy");
      }
      const myId = ++engineLinesRequestIdRef.current;
      isAnalysisBusyRef.current = true;
      try {
        const lines = await getTopEngineLines(fen, sf, {
          depth: opts?.depth ?? ENGINE_LINES_DEFAULT_DEPTH,
          multipv: opts?.multipv ?? 3,
        });
        if (myId !== engineLinesRequestIdRef.current) {
          return null;
        }
        return lines;
      } finally {
        if (myId === engineLinesRequestIdRef.current) {
          isAnalysisBusyRef.current = false;
        }
      }
    },
    []
  );

  const abortEngineLines = useCallback(() => {
    engineLinesRequestIdRef.current += 1;
    const sf = analysisStockfishRef.current;
    if (sf) {
      sendUciStop(sf);
    }
    isAnalysisBusyRef.current = false;
  }, []);

  return {
    isReady,
    /** Second worker finished loading; required for MultiPV panel. */
    isAnalysisEngineReady,
    isCalculating,
    getBestMove,
    getEvaluation,
    getEngineLines,
    abortEngineLines,
  };
}
