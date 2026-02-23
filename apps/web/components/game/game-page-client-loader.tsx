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
}

export function GamePageClientLoader({
  gameId,
  initialBoardOrientation,
}: GamePageClientLoaderProps) {
  return (
    <GamePageClient
      gameId={gameId}
      initialBoardOrientation={initialBoardOrientation}
    />
  );
}
