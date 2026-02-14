"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Make-move mutation wrapper with pending/error state and a ref
 * used by the engine effect to avoid duplicate submissions.
 * gameId is curried so callers only pass from/to/promotion.
 */
export function useMakeMove(gameId: string) {
  const makeMoveMutation = useMutation(api.games.makeMove);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMovePending, setIsMovePending] = useState(false);
  const justSubmittedEngineMoveRef = useRef(false);
  const resetRefTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (resetRefTimeoutIdRef.current !== null) {
        clearTimeout(resetRefTimeoutIdRef.current);
        resetRefTimeoutIdRef.current = null;
      }
    };
  }, []);

  const mutate = useCallback(
    async (variables: { from: string; to: string; promotion?: string }) => {
      setMoveError(null);
      setIsMovePending(true);
      try {
        await makeMoveMutation({
          gameId: toGameId(gameId),
          from: variables.from,
          to: variables.to,
          promotion: variables.promotion,
        });
        if (resetRefTimeoutIdRef.current !== null) {
          clearTimeout(resetRefTimeoutIdRef.current);
        }
        resetRefTimeoutIdRef.current = setTimeout(() => {
          justSubmittedEngineMoveRef.current = false;
          resetRefTimeoutIdRef.current = null;
        }, 800);
      } catch (error: unknown) {
        console.error("Move error:", error);
        justSubmittedEngineMoveRef.current = false;
        setMoveError(
          error instanceof Error ? error.message : "Failed to make move"
        );
      } finally {
        setIsMovePending(false);
      }
    },
    [makeMoveMutation, gameId]
  );

  return {
    makeMove: {
      mutate,
      isPending: isMovePending,
      isError: Boolean(moveError),
      error: moveError,
    },
    justSubmittedEngineMoveRef,
  };
}
