import { Chess } from "chess.js";
import { v } from "convex/values";

/**
 * Convex queries and mutations for games and moves.
 * Auth via ctx.auth.getUserIdentity() (Better Auth JWT).
 */
import type { MutationCtx, QueryCtx } from "./_generated/server";

import { mutation, query } from "./_generated/server";

const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

async function getUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

const getById = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== userId) {
      throw new Error("You do not have access to this game");
    }
    return game;
  },
});

const getMoves = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== userId) {
      throw new Error("You do not have access to this game");
    }
    const existingMoves = await ctx.db
      .query("moves")
      .withIndex("by_gameId_moveNumber", (idx) => idx.eq("gameId", args.gameId))
      .collect();
    return existingMoves;
  },
});

const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const limit = Math.min(args.limit ?? 50, 100);
    return await ctx.db
      .query("games")
      .withIndex("by_userId_updatedAt", (idx) => idx.eq("userId", userId))
      .order("desc")
      .take(limit);
  },
});

const create = mutation({
  args: {
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    color: v.union(v.literal("white"), v.literal("black"), v.literal("random")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const resolvedColor = (): "white" | "black" => {
      if (args.color === "random") {
        return Math.random() < 0.5 ? "white" : "black";
      }
      return args.color;
    };
    const color = resolvedColor();
    const gameId = await ctx.db.insert("games", {
      userId,
      status: "in_progress",
      difficulty: args.difficulty,
      color,
      fen: INITIAL_FEN,
      createdAt: now,
      updatedAt: now,
    });
    const game = await ctx.db.get(gameId);
    if (game === null) {
      throw new Error("Failed to create game");
    }
    return { id: gameId, status: game.status, fen: game.fen };
  },
});

const makeMove = mutation({
  args: {
    gameId: v.id("games"),
    from: v.string(),
    to: v.string(),
    promotion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== userId) {
      throw new Error("You do not have access to this game");
    }
    if (game.status !== "in_progress") {
      throw new Error("Game is not in progress");
    }

    const chess = new Chess();
    try {
      chess.load(game.fen);
    } catch {
      throw new Error("Invalid game position");
    }

    const { promotion } = args;
    const promotionPiece: "q" | "r" | "b" | "n" | undefined =
      promotion === "q" ||
      promotion === "r" ||
      promotion === "b" ||
      promotion === "n"
        ? promotion
        : undefined;
    const move = chess.move({
      from: args.from,
      to: args.to,
      promotion: promotionPiece,
    });
    if (move === null) {
      throw new Error("Invalid move");
    }

    const fenBefore = game.fen;
    const fenAfter = chess.fen();
    const pgn = chess.pgn();

    const existingMoves = await ctx.db
      .query("moves")
      .withIndex("by_gameId_moveNumber", (idx) => idx.eq("gameId", args.gameId))
      .collect();
    const lastMove =
      existingMoves.length > 0 ? existingMoves[existingMoves.length - 1] : null;
    const moveNumber = (lastMove?.moveNumber ?? 0) + 1;

    await ctx.db.insert("moves", {
      gameId: args.gameId,
      moveNumber,
      moveSan: move.san,
      moveUci: move.from + move.to + (move.promotion ?? ""),
      fenBefore,
      fenAfter,
      createdAt: Date.now(),
    });

    type GameStatus = "waiting" | "in_progress" | "completed" | "abandoned";
    type GameResult = "white_wins" | "black_wins" | "draw";
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

    await ctx.db.patch(args.gameId, {
      fen: fenAfter,
      pgn,
      status,
      result,
      updatedAt: Date.now(),
    });

    const updatedGame = await ctx.db.get(args.gameId);
    if (updatedGame === null) {
      throw new Error("Game not found after update");
    }

    return {
      success: true,
      game: updatedGame,
      move: {
        from: move.from,
        to: move.to,
        san: move.san,
        uci: move.from + move.to + (move.promotion ?? ""),
      },
    };
  },
});

const resign = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const game = await ctx.db.get(args.gameId);
    if (game === null) {
      throw new Error("Game not found");
    }
    if (game.userId !== userId) {
      throw new Error("You do not have access to this game");
    }
    if (game.status !== "in_progress") {
      throw new Error("Game is not in progress");
    }
    // Resigning player loses; opponent wins. game.color is the user's color.
    const result: "white_wins" | "black_wins" =
      game.color === "white" ? "black_wins" : "white_wins";
    await ctx.db.patch(args.gameId, {
      status: "completed",
      result,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export { getById, getMoves, list, create, makeMove, resign };
