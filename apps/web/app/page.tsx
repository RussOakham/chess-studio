import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { db } from "@repo/db";
import { games } from "@repo/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
            <p className="text-muted-foreground mt-1">
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
              <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            )}
          </div>

          {activeGames.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
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
                <Link key={game.id} href={`/game/${game.id}`}>
                  <Card className="hover:ring-2 hover:ring-primary transition-all cursor-pointer">
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
                        Updated:{" "}
                        {new Date(game.updatedAt).toLocaleDateString()}
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
              <Link href="/games" className="text-sm text-muted-foreground hover:text-foreground">
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
                <Link key={game.id} href={`/game/${game.id}`}>
                  <Card className="hover:ring-2 hover:ring-primary transition-all cursor-pointer">
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
                            {game.result
                              ? game.result
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())
                              : game.status === "completed"
                                ? "Draw"
                                : "Abandoned"}
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
      </main>
    </div>
  );
}
