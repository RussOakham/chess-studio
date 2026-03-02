import { GamePageClientLoader } from "@/components/game/game-page-client-loader";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { isConvexAuthError } from "@/lib/auth-error";
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

  let game: Doc<"games"> | null = null;
  try {
    game = await authServer.fetchAuthQuery(api.games.getById, {
      gameId: toGameId(gameId),
    });
  } catch (error) {
    if (isConvexAuthError(error)) {
      redirect("/login");
    }
    // Game not found: Convex throws Error with "Game not found" message
    if (error instanceof Error && /not found|404/i.test(error.message)) {
      notFound();
    }
    throw error;
  }

  // Player at bottom: orientation = player's color (resolved; "random" only before insert)
  const boardOrientation: "white" | "black" =
    game?.color === "black" ? "black" : "white";

  const userDisplayName = session.user.name ?? session.user.email ?? "You";

  return (
    <GamePageClientLoader
      gameId={gameId}
      initialBoardOrientation={boardOrientation}
      userDisplayName={userDisplayName}
    />
  );
}
