import { GamePageClient } from "@/components/game/game-page-client";
import { api } from "@/convex/_generated/api";
import { authServer, getSession } from "@/lib/auth-server";
import { toGameId } from "@/lib/convex-id";
import { notFound, redirect } from "next/navigation";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  try {
    await authServer.fetchAuthQuery(api.games.getById, {
      gameId: toGameId(gameId),
    });
  } catch {
    notFound();
  }

  const boardOrientation: "white" | "black" = "white";

  return (
    <GamePageClient
      gameId={gameId}
      initialBoardOrientation={boardOrientation}
    />
  );
}
