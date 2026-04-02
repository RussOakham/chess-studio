import { z } from "zod";

/**
 * Validated facts-only payload for the game-summary LLM (grounding layer).
 * Populated from `game_reviews` + `games` — see implementation plan (locked DTO table).
 */

const gameDifficultySchema = z.enum([
  "beginner",
  "casual",
  "club",
  "intermediate",
  "strong",
  "advanced",
  "expert",
  "maximum",
  "easy",
  "medium",
  "hard",
]);

const moveAnnotationSchema = z.object({
  moveNumber: z.number(),
  type: z.enum(["blunder", "mistake", "inaccuracy", "good", "best", "book"]),
  bestMoveSan: z.string().optional(),
  bestMoveUci: z.string().optional(),
  bookOpeningEco: z.string().optional(),
  bookOpeningName: z.string().optional(),
});

const gameFactsSchema = z.object({
  result: z.enum(["white_wins", "black_wins", "draw"]).optional(),
  difficulty: gameDifficultySchema,
  color: z.enum(["white", "black", "random"]),
  pgn: z.string().optional(),
  fen: z.string().optional(),
});

/** Max counts aligned with Convex `reviews.save` caps. */
const gameSummaryInputSchema = z
  .object({
    ruleBasedSummary: z.string().min(1),
    keyMoments: z.array(z.string()).max(20).optional(),
    suggestions: z.array(z.string()).max(10).optional(),
    evaluations: z.array(z.number()).max(500).optional(),
    openingNameLichess: z.string().optional(),
    moveAnnotations: z.array(moveAnnotationSchema).max(500).optional(),
    game: gameFactsSchema,
  })
  .strict();

type GameSummaryInput = z.infer<typeof gameSummaryInputSchema>;

interface ReviewSlice {
  summary: string;
  evaluations?: number[];
  keyMoments?: string[];
  suggestions?: string[];
  openingNameLichess?: string;
  moveAnnotations?: {
    moveNumber: number;
    type: "blunder" | "mistake" | "inaccuracy" | "good" | "best" | "book";
    bestMoveSan?: string;
    bestMoveUci?: string;
    bookOpeningEco?: string;
    bookOpeningName?: string;
  }[];
}

interface GameSlice {
  result?: "white_wins" | "black_wins" | "draw";
  difficulty: z.infer<typeof gameDifficultySchema>;
  color: "white" | "black" | "random";
  pgn?: string;
  fen?: string;
}

/**
 * Build and validate the DTO from Convex `game_reviews` + `games` rows.
 * Throws `ZodError` if data is inconsistent with the schema.
 */
function buildGameSummaryInput(args: {
  review: ReviewSlice;
  game: GameSlice;
}): GameSummaryInput {
  return gameSummaryInputSchema.parse({
    ruleBasedSummary: args.review.summary,
    keyMoments: args.review.keyMoments,
    suggestions: args.review.suggestions,
    evaluations: args.review.evaluations,
    openingNameLichess: args.review.openingNameLichess,
    moveAnnotations: args.review.moveAnnotations,
    game: {
      result: args.game.result,
      difficulty: args.game.difficulty,
      color: args.game.color,
      pgn: args.game.pgn,
      fen: args.game.fen,
    },
  });
}

export { buildGameSummaryInput, gameSummaryInputSchema, type GameSummaryInput };
