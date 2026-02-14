"use client";

import type { DifficultyLevel } from "@repo/chess";

import { useEffect, useRef } from "react";

/** Ref that is set true when the engine move is submitted, cleared after delay. */
type JustSubmittedRef = React.MutableRefObject<boolean>;

/**
 * Runs the effect that computes and submits the engine move when it's the engine's turn.
 */
export function useEngineMoveEffect({
  isEngineGame,
  isEngineTurn,
  gameStatus,
  gameFen,
  gameId,
  gameDifficulty,
  gameIdParam,
  isGameFetching,
  isStockfishReady,
  isCalculating,
  makeMoveIsPending,
  isCheckmate,
  isStalemate,
  isDraw,
  getBestMove,
  makeMoveMutate,
  justSubmittedRef,
}: {
  isEngineGame: boolean;
  isEngineTurn: boolean;
  gameStatus: string | undefined;
  gameFen: string | undefined;
  gameId: string | undefined;
  gameDifficulty: DifficultyLevel | undefined;
  gameIdParam: string;
  isGameFetching: boolean;
  isStockfishReady: boolean;
  isCalculating: boolean;
  makeMoveIsPending: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  getBestMove: (
    fen: string,
    difficulty: DifficultyLevel
  ) => Promise<{
    from: string;
    to: string;
    promotion?: string;
  }>;
  makeMoveMutate: (variables: {
    from: string;
    to: string;
    promotion?: string;
  }) => Promise<void>;
  justSubmittedRef: JustSubmittedRef;
}) {
  const calculationFenRef = useRef<string | null>(null);
  const getBestMoveRef = useRef(getBestMove);
  getBestMoveRef.current = getBestMove;

  useEffect(() => {
    if (justSubmittedRef.current) {
      return;
    }

    if (
      isEngineGame &&
      isEngineTurn &&
      gameStatus === "in_progress" &&
      !isGameFetching &&
      isStockfishReady &&
      !isCalculating &&
      !makeMoveIsPending &&
      !isCheckmate &&
      !isStalemate &&
      !isDraw &&
      gameDifficulty &&
      gameFen &&
      gameId
    ) {
      const fenAtStart = gameFen;

      calculationFenRef.current = fenAtStart;

      const timeout = setTimeout(() => {
        void (async () => {
          try {
            const getBestMoveFn = getBestMoveRef.current;
            if (!getBestMoveFn) {
              return;
            }
            const engineMove = await getBestMoveFn(fenAtStart, gameDifficulty);

            if (
              calculationFenRef.current !== fenAtStart ||
              justSubmittedRef.current
            ) {
              calculationFenRef.current = null;
              return;
            }

            justSubmittedRef.current = true;
            calculationFenRef.current = null;

            await makeMoveMutate({
              from: engineMove.from,
              to: engineMove.to,
              promotion: engineMove.promotion,
            });
          } catch (error) {
            console.error("Failed to calculate engine move:", error);
            calculationFenRef.current = null;
            justSubmittedRef.current = false;
          }
        })();
      }, 500);

      return () => {
        clearTimeout(timeout);
        if (calculationFenRef.current === fenAtStart) {
          calculationFenRef.current = null;
        }
      };
    }
  }, [
    isEngineGame,
    isEngineTurn,
    gameStatus,
    gameDifficulty,
    gameFen,
    gameId,
    gameIdParam,
    isGameFetching,
    isStockfishReady,
    isCalculating,
    makeMoveIsPending,
    isCheckmate,
    isStalemate,
    isDraw,
    getBestMove,
    makeMoveMutate,
    justSubmittedRef,
  ]);
}
