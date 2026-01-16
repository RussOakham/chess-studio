"use client";

import { GameChessboard } from "@/components/chess/game-chessboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGame } from "@/lib/hooks/use-game";
import Link from "next/link";

interface GamePageClientProps {
  gameId: string;
  initialBoardOrientation?: "white" | "black";
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

export function GamePageClient({
  gameId,
  initialBoardOrientation = "white",
}: GamePageClientProps) {
  const {
    game,
    moves,
    currentTurn,
    isInCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    isLoading,
    refetch,
  } = useGame(gameId);

  if (isLoading || !game) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  // Determine board orientation based on game state
  // For now, default to white. Later we can use the color preference from game creation
  const boardOrientation: "white" | "black" = initialBoardOrientation;

  // Format move history for display
  // Moves are numbered: 1 (white), 1 (black), 2 (white), 2 (black), etc.
  const moveHistory = moves.map((move) => {
    // Move number represents the full move pair (white + black)
    // For display: white moves show the number, black moves don't
    const movePairNumber = Math.ceil(move.moveNumber / 2);
    const isWhiteMove = move.moveNumber % 2 === 1;
    return {
      ...move,
      displayNumber: isWhiteMove ? movePairNumber : undefined,
      isWhiteMove,
    };
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Game {gameId.slice(0, 8)}</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Status:{" "}
                <span className="capitalize">
                  {game.status.replace("_", " ")}
                </span>
              </p>
              {game.status === "in_progress" && currentTurn && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">
                    Turn: <span className="capitalize">{currentTurn}</span>
                  </p>
                </>
              )}
              {isInCheck && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="destructive">Check</Badge>
                </>
              )}
              {isCheckmate && <Badge variant="destructive">Checkmate</Badge>}
              {isStalemate && <Badge variant="secondary">Stalemate</Badge>}
              {isDraw && <Badge variant="secondary">Draw</Badge>}
            </div>
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
                    gameId={game.id}
                    onMoveSuccess={refetch}
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
                {game.status === "in_progress" && currentTurn && (
                  <div>
                    <p className="text-sm font-medium">Turn</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {currentTurn}
                    </p>
                  </div>
                )}
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

            {/* Move History */}
            <Card>
              <CardHeader>
                <CardTitle>Move History</CardTitle>
                <CardDescription>
                  {moves.length === 0
                    ? "No moves yet"
                    : `${moves.length} move${moves.length === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {moves.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Move history will appear here as you play
                  </p>
                ) : (
                  <div className="max-h-96 space-y-1 overflow-y-auto">
                    {moveHistory.map((move) => (
                      <div
                        key={move.id}
                        className="flex items-center gap-2 rounded p-2 text-sm hover:bg-muted"
                      >
                        {move.displayNumber && (
                          <span className="font-medium text-muted-foreground">
                            {move.displayNumber}.
                          </span>
                        )}
                        <span
                          className={
                            move.isWhiteMove
                              ? "font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {move.moveSan}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
