"use client";

import dynamic from "next/dynamic";

const GamePageClient = dynamic(
  async () => {
    const mod = await import("@/components/game/game-page-client");
    return mod.GamePageClient;
  },
  { ssr: false }
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
    <GamePageClient
      gameId={gameId}
      initialBoardOrientation={initialBoardOrientation}
      userDisplayName={userDisplayName}
    />
  );
}
