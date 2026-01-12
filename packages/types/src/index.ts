// Shared TypeScript types for the chess game application

// User types
interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Game types
type GameStatus = "waiting" | "in_progress" | "completed" | "abandoned";

type GameResult = "white_wins" | "black_wins" | "draw" | null;

interface Game {
  id: string;
  userId: string;
  status: GameStatus;
  result: GameResult;
  fen: string;
  pgn: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Move types
interface Move {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  timestamp: Date;
}

// Engine evaluation types
interface Evaluation {
  score: number;
  depth: number;
  bestMove: string | null;
  pv: string[];
}

// AI hint types
interface AIHint {
  move: string;
  explanation: string;
  evaluation: number;
}

// Game review types
interface GameReview {
  gameId: string;
  summary: string;
  keyMoments: string[];
  suggestions: string[];
  createdAt: Date;
}

export {
  type User,
  type GameStatus,
  type GameResult,
  type Game,
  type Move,
  type Evaluation,
  type AIHint,
  type GameReview,
};
