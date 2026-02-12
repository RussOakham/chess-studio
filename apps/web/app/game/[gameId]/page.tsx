import { GamePageClient } from "@/components/game/game-page-client";
import { getSession } from "@/lib/auth-server";
import { GamesRepository } from "@/lib/data-access/games.repository";
import { notFound, redirect } from "next/navigation";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;

  // Check authentication
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch game data to verify ownership (server-side check)
  const repository = new GamesRepository();
  const game = await repository.findById(gameId);

  // Handle game not found
  if (!game) {
    notFound();
  }

  // Verify user owns the game
  if (game.userId !== session.user.id) {
    notFound(); // Don't reveal that game exists if user doesn't own it
  }

  // Determine board orientation based on game state
  // For now, default to white. Later we can use the color preference from game creation
  const boardOrientation: "white" | "black" = "white";

  // Render client component that handles real-time updates
  return (
    <GamePageClient
      gameId={gameId}
      initialBoardOrientation={boardOrientation}
    />
  );
}
