// API request and response types

import type { InferSelectModel, games } from "@repo/db";

// Game type from database schema
type Game = InferSelectModel<typeof games>;

// Request types
interface CreateGameRequest {
  difficulty: "easy" | "medium" | "hard";
  color: "white" | "black" | "random";
}

// Response types
interface ListGamesResponse {
  activeGames: Game[];
  recentGames: Game[];
}

interface CreateGameResponse {
  id: string;
  status: string;
  fen: string;
}

export {
  type Game,
  type CreateGameRequest,
  type ListGamesResponse,
  type CreateGameResponse,
};
