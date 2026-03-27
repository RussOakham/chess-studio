"use client";

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
import { PageLoading } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import { gameList, loading } from "@/lib/copy";
import {
  formatBadgeText,
  getStatusLabel,
  isActive,
  isRecent,
} from "@/lib/game-list-helpers";
import { useQuery } from "convex/react";
import Link from "next/link";

export function HomeGamesList() {
  const gamesQuery = useQuery(api.games.list, { limit: 15 });
  const games = gamesQuery ?? [];
  const isLoading = gamesQuery === undefined;

  const activeGames = games.filter((game) => isActive(game.status));
  const recentGames = games.filter((game) => isRecent(game.status));

  if (isLoading) {
    return <PageLoading message={loading.games} />;
  }

  return (
    <>
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">
            {gameList.sections.activeGames}
          </h2>
          {activeGames.length > 0 && (
            <Link
              href="/games"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {gameList.viewAll}
            </Link>
          )}
        </div>

        {activeGames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                {gameList.empty.noActiveGames}
              </p>
              <Link href="/game/new">
                <Button>{gameList.actions.createNewGame}</Button>
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
                        <CardTitle>
                          {gameList.gameCardTitle(game._id.slice(0, 8))}
                        </CardTitle>
                        <CardDescription>
                          {getStatusLabel(game.status)}
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
                            ? gameList.homeActiveBadge.playing
                            : gameList.homeActiveBadge.waiting}
                        </Badge>
                      </CardAction>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      {gameList.meta.updatedPrefix}{" "}
                      {new Date(game.updatedAt).toLocaleDateString()}
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
          <h2 className="text-2xl font-semibold">
            {gameList.sections.recentGames}
          </h2>
          {recentGames.length > 0 && (
            <Link
              href="/games"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {gameList.viewAll}
            </Link>
          )}
        </div>

        {recentGames.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {gameList.empty.noCompletedGames}
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
                        <CardTitle>
                          {gameList.gameCardTitle(game._id.slice(0, 8))}
                        </CardTitle>
                        <CardDescription>
                          {getStatusLabel(game.status)}
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
                        ? gameList.meta.completedOn(
                            new Date(game.updatedAt).toLocaleDateString()
                          )
                        : gameList.meta.abandonedOn(
                            new Date(game.updatedAt).toLocaleDateString()
                          )}
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
