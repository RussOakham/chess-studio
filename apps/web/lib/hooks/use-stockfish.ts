"use client";

import type {
  DifficultyLevel,
  PositionEvaluation,
  StockfishInstance,
} from "@repo/chess";

import {
  getEngineDepth,
  calculateBestMove,
  getPositionEvaluation,
} from "@repo/chess";
import { useEffect, useRef, useState } from "react";

/**
 * Hook for using Stockfish engine in the browser
 * Calculates best moves client-side using Web Workers
 * Uses native Worker API with files from /public/engine/
 */
export function useStockfish() {
  const [isReady, setIsReady] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const stockfishRef = useRef<StockfishInstance | null>(null);

  // Initialize Stockfish on mount using native Web Worker
  useEffect(() => {
    // Only initialize in browser
    if (typeof globalThis === "undefined" || typeof Worker === "undefined") {
      return;
    }

    let isMounted = true;

    try {
      // Create a Web Worker from the stockfish.js file in public/engine/
      // The stockfish.js file is designed to work as a Web Worker
      const worker = new Worker("/engine/stockfish.js", {
        type: "module",
      });

      // Wrap the native Worker to match our StockfishInstance interface
      const stockfishWrapper: StockfishInstance = {
        postMessage: (message: string) => {
          // Worker.postMessage doesn't require targetOrigin (only Window.postMessage does)
          // eslint-disable-next-line unicorn/require-post-message-target-origin
          worker.postMessage(message);
        },
        addEventListener: (
          _type: "message",
          listener: (event: MessageEvent<string>) => void
        ) => {
          worker.addEventListener("message", (event) => {
            // Worker message events are MessageEvent<string> for stockfish
            // Type guard to ensure event is MessageEvent<string>
            if (
              event instanceof MessageEvent &&
              typeof event.data === "string"
            ) {
              listener(event as MessageEvent<string>);
            }
          });
        },
        removeEventListener: (
          _type: "message",
          listener: (event: MessageEvent<string>) => void
        ) => {
          // Worker removeEventListener accepts EventListener, which MessageEvent listener implements
          worker.removeEventListener(
            "message",
            listener as unknown as EventListener
          );
        },
        terminate: () => {
          worker.terminate();
        },
      };

      if (isMounted) {
        stockfishRef.current = stockfishWrapper;
        setIsReady(true);
      }
    } catch (error) {
      console.error("Failed to initialize Stockfish:", error);
    }

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
    };
  }, []);

  /**
   * Calculate best move using Stockfish
   */
  const getBestMove = async (
    fen: string,
    difficulty: DifficultyLevel
  ): Promise<{
    from: string;
    to: string;
    promotion?: string;
    uci: string;
  }> => {
    if (!stockfishRef.current) {
      throw new Error("Stockfish not initialized");
    }

    if (isCalculating) {
      throw new Error("Stockfish is already calculating");
    }

    setIsCalculating(true);

    try {
      const depth = getEngineDepth(difficulty);
      const bestMoveUci = await calculateBestMove(
        fen,
        depth,
        stockfishRef.current
      );

      // Parse UCI move (e.g., "e2e4" or "e7e8q")
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
      setIsCalculating(false);
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
    if (isCalculating) {
      throw new Error("Stockfish is already calculating");
    }
    setIsCalculating(true);
    try {
      return await getPositionEvaluation(fen, stockfishRef.current);
    } finally {
      setIsCalculating(false);
    }
  };

  return {
    isReady,
    isCalculating,
    getBestMove,
    getEvaluation,
  };
}
