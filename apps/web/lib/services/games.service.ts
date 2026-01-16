// Service layer for games - business logic and orchestration

import type { Game, GamesRepository } from "@/lib/data-access/games.repository";
import type { CreateGameRequest, ListGamesResponse } from "@/lib/types/api";

import { INITIAL_FEN } from "@repo/chess";

export class GamesService {
  constructor(private repository: GamesRepository) {}

  async listUserGames(userId: string): Promise<ListGamesResponse> {
    const [activeGames, recentGames] = await Promise.all([
      this.repository.findActiveGamesByUserId(userId),
      this.repository.findRecentGamesByUserId(userId),
    ]);

    return { activeGames, recentGames };
  }

  async createGame(
    userId: string,
    _options: CreateGameRequest
  ): Promise<Pick<Game, "id" | "status" | "fen">> {
    // Business logic: determine initial state, validate rules
    // For engine games, start immediately (no waiting for opponent)
    const game = await this.repository.createGame({
      userId,
      fen: INITIAL_FEN,
      status: "in_progress", // Start game immediately for engine games
    });

    // TODO: Store difficulty/color when schema is extended
    // For now, we'll use these when implementing the engine in Phase 2

    return {
      id: game.id,
      status: game.status,
      fen: game.fen,
    };
  }
}
