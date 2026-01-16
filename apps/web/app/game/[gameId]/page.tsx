import { GameChessboard } from "@/components/chess/game-chessboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { GamesRepository } from "@/lib/data-access/games.repository";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

// Get status description
function getStatusDescription(status: string): string {
  if (status === "in_progress") {
    return "Make your move";
  }
  if (status === "waiting") {
    return "Waiting to start";
  }
  return "Game ended";
}

export default async function GamePage({ params }: GamePageProps) {
  const { gameId } = await params;

  // Check authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch game data
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Game {gameId.slice(0, 8)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: {game.status}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Chessboard Area */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Chessboard</CardTitle>
                <CardDescription>
                  {getStatusDescription(game.status)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <GameChessboard
                    position={game.fen}
                    orientation={boardOrientation}
                    draggable={game.status === "in_progress"}
                    status={game.status}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Info Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {game.status.replace("_", " ")}
                  </p>
                </div>
                {game.result && (
                  <div>
                    <p className="text-sm font-medium">Result</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {game.result.replace("_", " ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(game.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(game.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Game Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Game Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {game.status === "in_progress" && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled
                    // TODO: Implement resign in Phase 3.2
                  >
                    Resign
                  </Button>
                )}
                {game.status === "in_progress" && (
                  <Button variant="outline" className="w-full" disabled>
                    Offer Draw
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Move History (Placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Move history will be displayed here in Phase 2.1
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
