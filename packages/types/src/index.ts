// Shared TypeScript types for the chess game application

// User types
export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Game types
export type GameStatus = "waiting" | "in_progress" | "completed" | "abandoned";

export type GameResult = "white_wins" | "black_wins" | "draw" | null;

export type Game = {
  id: string;
  userId: string;
  status: GameStatus;
  result: GameResult;
  fen: string;
  pgn: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Move types
export type Move = {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  timestamp: Date;
};

// Engine evaluation types
export type Evaluation = {
  score: number;
  depth: number;
  bestMove: string | null;
  pv: string[];
};

// AI hint types
export type AIHint = {
  move: string;
  explanation: string;
  evaluation: number;
};

// Game review types
export type GameReview = {
  gameId: string;
  summary: string;
  keyMoments: string[];
  suggestions: string[];
  createdAt: Date;
};
