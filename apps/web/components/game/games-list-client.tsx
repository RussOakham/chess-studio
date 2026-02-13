"use client";

import type { Doc } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
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

function formatBadgeText(game: Doc<"games">): string {
  if (game.result) {
    return game.result
      .replaceAll("_", " ")
      .replaceAll(/\b\w/g, (letter: string) => letter.toUpperCase());
  }
  if (game.status === "completed") {
    return "Draw";
  }
  if (game.status === "in_progress") {
    return "In Progress";
  }
  if (game.status === "waiting") {
    return "Waiting";
  }
  return "Abandoned";
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "in_progress": {
      return "In Progress";
    }
    case "waiting": {
      return "Waiting";
    }
    case "completed": {
      return "Completed";
    }
    default: {
      return "Abandoned";
    }
  }
}

function getBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "in_progress") {
    return "default";
  }
  if (status === "completed") {
    return "secondary";
  }
  return "outline";
}

export function GamesListClient() {
  const gamesQuery = useQuery(api.games.list, { limit: 100 });
  const games = gamesQuery ?? [];
  const isLoading = gamesQuery === undefined;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading games…</p>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No games yet. Start a new game to begin playing!
          </p>
          <Link
            href="/game/new"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Create New Game →
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
                  <CardTitle>Game {game._id.slice(0, 8)}</CardTitle>
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
                Updated: {new Date(game.updatedAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
