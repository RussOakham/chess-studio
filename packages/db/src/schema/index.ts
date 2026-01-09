// Drizzle ORM schema definitions

import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";

// Game status enum
export const gameStatusEnum = pgEnum("game_status", [
  "waiting",
  "in_progress",
  "completed",
  "abandoned",
]);

// Game result enum
export const gameResultEnum = pgEnum("game_result", [
  "white_wins",
  "black_wins",
  "draw",
]);

// Users table
// Note: Better Auth may handle user management, but we'll define a basic structure
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Games table
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: gameStatusEnum("status").notNull().default("waiting"),
  result: gameResultEnum("result"),
  fen: text("fen").notNull(), // Current position in FEN notation
  pgn: text("pgn"), // Game notation in PGN format
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Moves table
export const moves = pgTable("moves", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  moveNumber: integer("move_number").notNull(),
  moveSan: text("move_san").notNull(), // Standard Algebraic Notation
  moveUci: text("move_uci").notNull(), // Universal Chess Interface notation
  fenBefore: text("fen_before").notNull(), // Position before move
  fenAfter: text("fen_after").notNull(), // Position after move
  evaluation: real("evaluation"), // Engine evaluation in centipawns
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Game reviews table (for AI-generated summaries)
export const gameReviews = pgTable("game_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" })
    .unique(), // One review per game
  summary: text("summary").notNull(), // AI-generated game summary
  keyMoments: text("key_moments").array(), // Array of key moment descriptions
  suggestions: text("suggestions").array(), // Array of improvement suggestions
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Export schema object for Drizzle
export const schema = {
  users,
  games,
  moves,
  gameReviews,
};
