import type { InferSelectModel } from "@repo/db";

import { SignOutButton } from "@/components/auth/sign-out-button";
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
import { auth } from "@/lib/auth";
import { and, db, desc, eq, games, or } from "@repo/db";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch active games (in_progress or waiting)
  const activeGames = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.userId, userId),
        or(eq(games.status, "in_progress"), eq(games.status, "waiting"))
      )
    )
    .orderBy(desc(games.updatedAt))
    .limit(10);

  // Fetch recent games (completed or abandoned, last 5)
  const recentGames = await db
    .select()
    .from(games)
    .where(
      and(
        eq(games.userId, userId),
        or(eq(games.status, "completed"), eq(games.status, "abandoned"))
      )
    )
    .orderBy(desc(games.updatedAt))
    .limit(5);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Chess Studio</h1>
            <p className="mt-1 text-muted-foreground">
              Welcome back, {session.user.name || session.user.email}!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/game/new">
              <Button size="lg">New Game</Button>
            </Link>
            <SignOutButton />
          </div>
        </div>

        {/* Active Games Section */}
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
              {activeGames.map((game: InferSelectModel<typeof games>) => (
                <Link key={game.id} href={`/game/${game.id}`}>
                  <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>Game {game.id.slice(0, 8)}</CardTitle>
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

        {/* Recent Games Section */}
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
              {recentGames.map((game: InferSelectModel<typeof games>) => {
                // oxlint-disable-next-line init-declarations
                let badgeText: string;
                if (game.result) {
                  badgeText = game.result
                    .replace("_", " ")
                    .replaceAll(/\b\w/g, (letter: string) =>
                      letter.toUpperCase()
                    );
                } else if (game.status === "completed") {
                  badgeText = "Draw";
                } else {
                  badgeText = "Abandoned";
                }

                return (
                  <Link key={game.id} href={`/game/${game.id}`}>
                    <Card className="cursor-pointer transition-all hover:ring-2 hover:ring-primary">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle>Game {game.id.slice(0, 8)}</CardTitle>
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
                              {badgeText}
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
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
