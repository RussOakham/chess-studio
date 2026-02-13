"use client";

import type { Doc } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

const ACTIVE_STATUSES = ["in_progress", "waiting"] as const;
const RECENT_STATUSES = ["completed", "abandoned"] as const;

function isActive(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

function isRecent(status: string): boolean {
  return (RECENT_STATUSES as readonly string[]).includes(status);
}

function formatBadgeText(game: Doc<"games">): string {
  if (game.result) {
    return game.result
      .replaceAll("_", " ")
      .replaceAll(/\b\w/g, (letter: string) => letter.toUpperCase());
  }
  if (game.status === "completed") {
    return "Draw";
  }
  return "Abandoned";
}

export function HomeGamesList() {
  const gamesQuery = useQuery(api.games.list, { limit: 15 });
  const games = gamesQuery ?? [];
  const isLoading = gamesQuery === undefined;

  const activeGames = games.filter((game) => isActive(game.status));
  const recentGames = games.filter((game) => isRecent(game.status));

  if (isLoading) {
    return (
      <div className="space-y-8">
        <p className="text-muted-foreground">Loading games…</p>
      </div>
    );
  }

  return (
    <>
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Active Games</h2>
          {activeGames.length > 0 && (
            <Link
              href="/games"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          )}
        </div>

        {activeGames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No active games. Start a new game to begin playing!
              </p>
              <Link href="/game/new">
                <Button>Create New Game</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGames.map((game) => (
              <Link key={game._id} href={`/game/${game._id}`}>
                <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Game {game._id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {game.status === "in_progress"
                            ? "In Progress"
                            : "Waiting"}
                        </CardDescription>
                      </div>
                      <CardAction>
                        <Badge
                          variant={
                            game.status === "in_progress"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {game.status === "in_progress"
                            ? "Playing"
                            : "Waiting"}
                        </Badge>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      Updated: {new Date(game.updatedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recent Games</h2>
          {recentGames.length > 0 && (
            <Link
              href="/games"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          )}
        </div>

        {recentGames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No completed games yet. Your game history will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recentGames.map((game) => (
              <Link key={game._id} href={`/game/${game._id}`}>
                <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Game {game._id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          {game.status === "completed"
                            ? "Completed"
                            : "Abandoned"}
                        </CardDescription>
                      </div>
                      <CardAction>
                        <Badge
                          variant={
                            game.status === "completed"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {formatBadgeText(game)}
                        </Badge>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      {game.status === "completed"
                        ? `Completed: ${new Date(game.updatedAt).toLocaleDateString()}`
                        : `Abandoned: ${new Date(game.updatedAt).toLocaleDateString()}`}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
