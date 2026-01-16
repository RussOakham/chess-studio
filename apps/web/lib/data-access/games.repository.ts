// Data-access layer for games - all database operations

import type { InferSelectModel } from "@repo/db";

import { and, db, desc, eq, games, or } from "@repo/db";

export type Game = InferSelectModel<typeof games>;

export class GamesRepository {
  async findActiveGamesByUserId(userId: string, limit = 10): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "in_progress"), eq(games.status, "waiting"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(limit);
  }

  async findRecentGamesByUserId(userId: string, limit = 5): Promise<Game[]> {
    return db
      .select()
      .from(games)
      .where(
        and(
          eq(games.userId, userId),
          or(eq(games.status, "completed"), eq(games.status, "abandoned"))
        )
      )
      .orderBy(desc(games.updatedAt))
      .limit(limit);
  }

  async createGame(data: {
    userId: string;
    fen: string;
    status: "waiting" | "in_progress" | "completed" | "abandoned";
    difficulty?: "easy" | "medium" | "hard";
    color?: "white" | "black" | "random";
  }): Promise<Game> {
    const [newGame] = await db
      .insert(games)
      .values({
        userId: data.userId,
        status: data.status,
        fen: data.fen,
        // Use provided values or defaults (schema has defaults: "medium" and "random")
        difficulty: data.difficulty ?? "medium",
        color: data.color ?? "random",
      })
      .returning();

    if (!newGame) {
      throw new Error("Failed to create game");
    }

    return newGame;
  }

  async findById(gameId: string): Promise<Game | null> {
    const [game] = await db
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);

    return game ?? null;
  }

  async updateGame(
    gameId: string,
    updates: Partial<Pick<Game, "status" | "result" | "fen" | "pgn">>
  ): Promise<Game> {
    const [updatedGame] = await db
      .update(games)
      .set(updates)
      .where(eq(games.id, gameId))
      .returning();

    if (!updatedGame) {
      throw new Error("Failed to update game");
    }

    return updatedGame;
  }
}
