"use client";

import { PageLoading } from "@/components/ui/page-loading";
import dynamic from "next/dynamic";

/** Lazy load GamePageClient with ssr: false (code-split, no SSR). Inline import is intentional for Next.js dynamic(). */
const GamePageClient = dynamic(
  async () => {
    const mod = await import("@/components/game/game-page-client");
    return mod.GamePageClient;
  },
  {
    ssr: false,
    loading: () => (
      <PageLoading
        className="min-h-0 flex-1 justify-center"
        message="Loading game…"
      />
    ),
  }
);

interface GamePageClientLoaderProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
  /** Display name for the human player (e.g. email until usernames exist). */
  userDisplayName?: string;
}

export function GamePageClientLoader({
  gameId,
  initialBoardOrientation,
  userDisplayName,
}: GamePageClientLoaderProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GamePageClient
        gameId={gameId}
        initialBoardOrientation={initialBoardOrientation}
        userDisplayName={userDisplayName}
      />
    </div>
  );
}
