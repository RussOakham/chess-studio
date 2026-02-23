import { api } from "@/convex/_generated/api";
import { isConvexAuthError } from "@/lib/auth-error";
import { authServer, getSession } from "@/lib/auth-server";
import { toGameId } from "@/lib/convex-id";
import dynamic from "next/dynamic";
import { notFound, redirect } from "next/navigation";

const GamePageClient = dynamic(
  async () => {
    const mod = await import("@/components/game/game-page-client");
    return mod.GamePageClient;
  },
  { ssr: false }
);

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

  const boardOrientation: "white" | "black" = "white";

  return (
    <GamePageClient
      gameId={gameId}
      initialBoardOrientation={boardOrientation}
    />
  );
}
