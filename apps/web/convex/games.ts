import { Chess } from "chess.js";
import { v } from "convex/values";

/**
 * Convex queries and mutations for games and moves.
 * Auth via custom wrappers in `./lib/authed_functions` (Better Auth JWT).
 */
import type { Doc } from "./_generated/dataModel";
import { createGameDifficultyValidator } from "./gameDifficulty";
import {
  authedMutation,
  authedQuery,
  ownedGameMutation,
  ownedGameQuery,
} from "./lib/authed_functions";
import {
  gameValidator,
  makeMoveReturnMoveValidator,
  moveValidator,
} from "./validators";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

type GameStatus = "waiting" | "in_progress" | "completed" | "abandoned";
type GameResult = "white_wins" | "black_wins" | "draw";

/** Pure helper: apply a move to a game's FEN; returns new state and move info. Throws on invalid position or move. */
function applyMove(
  game: Doc<"games">,
  from: string,
  to: string,
  promotion?: "q" | "r" | "b" | "n"
): {
  fenAfter: string;
  pgn: string;
  status: GameStatus;
  result: GameResult | undefined;
  move: { from: string; to: string; san: string; uci: string };
} {
  const chess = new Chess();
  const pgnTrimmed = game.pgn?.trim();
  if (pgnTrimmed) {
    try {
      chess.loadPgn(pgnTrimmed);
    } catch {
      throw new Error("Invalid game PGN");
    }
  } else {
    try {
      chess.load(game.fen);
    } catch {
      throw new Error("Invalid game position");
    }
  }
  const move = (() => {
    try {
      return chess.move({ from, to, promotion });
    } catch {
      throw new Error("Invalid move");
    }
  })();
  const { status: currentStatus, result: currentResult } = game;
  let status: GameStatus = currentStatus;
  let result: GameResult | undefined = currentResult;
  if (chess.isCheckmate()) {
    status = "completed";
    result = chess.turn() === "w" ? "black_wins" : "white_wins";
  } else if (chess.isDraw() || chess.isStalemate()) {
    status = "completed";
    result = "draw";
  }
  return {
    fenAfter: chess.fen(),
    pgn: chess.pgn(),
    status,
    result,
    move: {
      from: move.from,
      to: move.to,
      san: move.san,
      uci: move.from + move.to + (move.promotion ?? ""),
    },
  };
}

const getById = ownedGameQuery({
  args: {},
  returns: gameValidator,
  handler: async ({ game }) => {
    return game;
  },
});

/** Maximum moves returned per game (long games are capped). */
const GET_MOVES_CAP = 500;

const getMoves = ownedGameQuery({
  args: {},
  returns: v.array(moveValidator),
  handler: async ({ db }, args) => {
    return await db
      .query("moves")
      .withIndex("by_gameId_moveNumber", (idx) => idx.eq("gameId", args.gameId))
      .order("asc")
      .take(GET_MOVES_CAP);
  },
});

const list = authedQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(gameValidator),
  handler: async ({ userId, db }, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 100));
    return await db
      .query("games")
      .withIndex("by_userId_updatedAt", (idx) => idx.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

const create = authedMutation({
  args: {
    difficulty: createGameDifficultyValidator,
    color: v.union(v.literal("white"), v.literal("black"), v.literal("random")),
  },
  returns: v.object({
    id: v.id("games"),
    status: v.string(),
    fen: v.string(),
  }),
  handler: async ({ userId, db }, args) => {
    const now = Date.now();
    const resolvedColor = (): "white" | "black" => {
      if (args.color === "random") {
        return Math.random() < 0.5 ? "white" : "black";
      }
      return args.color;
    };
    const color = resolvedColor();
    const gameId = await db.insert("games", {
      userId,
      status: "in_progress",
      difficulty: args.difficulty,
      color,
      fen: INITIAL_FEN,
      createdAt: now,
      updatedAt: now,
    });
    const game = await db.get(gameId);
    if (game === null) {
      throw new Error("Failed to create game");
    }
    return { id: gameId, status: game.status, fen: game.fen };
  },
});

const makeMove = ownedGameMutation({
  args: {
    from: v.string(),
    to: v.string(),
    promotion: v.optional(
      v.union(v.literal("q"), v.literal("r"), v.literal("b"), v.literal("n"))
    ),
  },
  returns: v.object({
    success: v.literal(true),
    game: gameValidator,
    move: makeMoveReturnMoveValidator,
  }),
  handler: async ({ game, db }, args) => {
    if (game.status !== "in_progress") {
      throw new Error("Game is not in progress");
    }

    const { fenAfter, pgn, status, result, move } = applyMove(
      game,
      args.from,
      args.to,
      args.promotion
    );

    const existingMoves = await db
      .query("moves")
      .withIndex("by_gameId_moveNumber", (idx) => idx.eq("gameId", args.gameId))
      .order("desc")
      .take(1);
    const lastMove = existingMoves.length > 0 ? existingMoves[0] : null;
    const moveNumber = (lastMove?.moveNumber ?? 0) + 1;

    await db.insert("moves", {
      gameId: args.gameId,
      moveNumber,
      moveSan: move.san,
      moveUci: move.uci,
      fenBefore: game.fen,
      fenAfter,
      createdAt: Date.now(),
    });

    await db.patch(args.gameId, {
      fen: fenAfter,
      pgn,
      status,
      result,
      updatedAt: Date.now(),
    });

    const updatedGame = await db.get(args.gameId);
    if (updatedGame === null) {
      throw new Error("Game not found after update");
    }

    return {
      success: true as const,
      game: updatedGame,
      move,
    };
  },
});

const resign = ownedGameMutation({
  args: {},
  returns: v.object({ success: v.literal(true) }),
  handler: async ({ game, db }, args) => {
    if (game.status !== "in_progress") {
      throw new Error("Game is not in progress");
    }
    // Resigning player loses; opponent wins. game.color is the user's color.
    if (game.color !== "white" && game.color !== "black") {
      throw new Error("Cannot resign: invalid player color on this game");
    }
    const result: "white_wins" | "black_wins" =
      game.color === "white" ? "black_wins" : "white_wins";
    await db.patch(args.gameId, {
      status: "completed",
      result,
      updatedAt: Date.now(),
    });
    return { success: true as const };
  },
});

export { getById, getMoves, list, create, makeMove, resign };
