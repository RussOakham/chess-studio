"use client";

import { Badge } from "@/components/ui/badge";
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
import { errors, gameList, loading } from "@/lib/copy";
import {
  formatBadgeText,
  getBadgeVariant,
  getStatusLabel,
} from "@/lib/game-list-helpers";
import { useConvexAuthGate } from "@/lib/hooks/use-convex-auth-gate";
import { useQuery } from "convex/react";
import Link from "next/link";

export function GamesListClient() {
  const { authLoading, isAuthenticated } = useConvexAuthGate();
  const gamesQuery = useQuery(
    api.games.list,
    authLoading || !isAuthenticated ? "skip" : { limit: 100 }
  );

  if (authLoading) {
    return <PageLoading message={loading.games} />;
  }
  if (!isAuthenticated) {
    return <PageLoading message={errors.redirectingToSignIn} />;
  }
  if (gamesQuery === undefined) {
    return <PageLoading message={loading.games} />;
  }

  const games = gamesQuery;

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{gameList.empty.noGamesYet}</p>
          <Link
            href="/game/new"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            {gameList.actions.createNewGameArrow}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
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
                  <Badge variant={getBadgeVariant(game.status)}>
                    {formatBadgeText(game)}
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
  );
}
