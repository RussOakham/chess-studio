"use client";

import { api } from "@/convex/_generated/api";
import { toGameId } from "@/lib/convex-id";
import { useMutation } from "convex/react";
import { useCallback, useRef, useState } from "react";

/**
 * Make-move mutation wrapper with pending/error state and a ref
 * used by the engine effect to avoid duplicate submissions.
 */
export function useMakeMove(_gameId: string) {
  const makeMoveMutation = useMutation(api.games.makeMove);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMovePending, setIsMovePending] = useState(false);
  const justSubmittedEngineMoveRef = useRef(false);

  const mutate = useCallback(
    async (variables: {
      gameId: string;
      from: string;
      to: string;
      promotion?: string;
    }) => {
      setMoveError(null);
      setIsMovePending(true);
      try {
        await makeMoveMutation({
          gameId: toGameId(variables.gameId),
          from: variables.from,
          to: variables.to,
          promotion: variables.promotion,
        });
        setTimeout(() => {
          justSubmittedEngineMoveRef.current = false;
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
    [makeMoveMutation]
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
