import { GamesRepository } from "@/lib/data-access/games.repository";
import { MovesRepository } from "@/lib/data-access/moves.repository";
import { GamesService } from "@/lib/services/games.service";
import { newGameSchema } from "@/lib/validations/game";
import { TRPCError } from "@trpc/server";
import { Chess } from "chess.js";
import { z } from "zod";

import { router, protectedProcedure } from "../init";

// Initialize service layer (reuse existing)
const repository = new GamesRepository();
const movesRepository = new MovesRepository();
const service = new GamesService(repository, movesRepository);

export const gamesRouter = router({
  // List user's games
  list: protectedProcedure.query(async ({ ctx }) => {
    const games = await service.listUserGames(ctx.userId);
    return games;
  }),

  // Create new game
  create: protectedProcedure
    .input(newGameSchema)
    .mutation(async ({ ctx, input }) => {
      const game = await service.createGame(ctx.userId, input);
      return game;
    }),

  // Get game by ID
  getById: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .query(async ({ ctx, input }) => {
      const game = await repository.findById(input.gameId);

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      // Verify user owns the game
      if (game.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this game",
        });
      }

      return game;
    }),

  // Get moves for a game
  getMoves: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .query(async ({ ctx, input }) => {
      // First verify game exists and user owns it
      const game = await repository.findById(input.gameId);

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this game",
        });
      }

      // Get moves for the game
      const gameMoves = await movesRepository.findByGameId(input.gameId);
      return gameMoves;
    }),

  // Make a move
  makeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.uuidv7(),
        from: z.string(),
        to: z.string(),
        promotion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await service.makeMove(
          ctx.userId,
          input.gameId,
          input.from,
          input.to,
          input.promotion
        );

        return {
          success: result.success,
          game: result.game,
          move: result.move,
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof Error) {
          if (error.message === "Game not found") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: error.message,
            });
          }
          if (error.message === "You do not have access to this game") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: error.message,
            });
          }
          if (
            // oxlint-disable-next-line typescript/prefer-optional-chain
            error.message === "Game is not in progress" ||
            error.message === "Invalid move" ||
            error?.message === "Invalid game position"
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
        }

        // Generic error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to make move",
        });
      }
    }),

  // Get and execute engine move
  getEngineMove: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .mutation(async ({ ctx, input }) => {
      // Verify game exists and user owns it
      const game = await repository.findById(input.gameId);

      if (!game) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }

      if (game.userId !== ctx.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this game",
        });
      }

      if (game.status !== "in_progress") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game is not in progress",
        });
      }

      // Check if it's the engine's turn
      const chess = new Chess();
      try {
        chess.load(game.fen);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid game position",
        });
      }

      // Determine if it's engine's turn
      // If user is playing white, engine plays black (turn === 'b')
      // If user is playing black, engine plays white (turn === 'w')
      const currentTurn = chess.turn();
      const userColor = game.color === "random" ? "white" : game.color;
      const engineColor = userColor === "white" ? "black" : "white";
      const isEngineTurn =
        (currentTurn === "w" && engineColor === "white") ||
        (currentTurn === "b" && engineColor === "black");

      if (!isEngineTurn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "It is not the engine's turn",
        });
      }

      // Engine moves are calculated client-side using the useStockfish hook
      // The client calculates the move and calls makeMove endpoint directly
      // This endpoint is kept for future server-side engine support if needed
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message:
          "Engine moves are calculated client-side. Use the makeMove endpoint with the engine's calculated move.",
      });
    }),

  // Resign game (future - Phase 3.2)
  resign: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .mutation(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // TODO: Implement when Phase 3.2 is ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Resign endpoint not implemented yet",
      });
    }),

  // Offer draw (future - Phase 3.2)
  offerDraw: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .mutation(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // TODO: Implement when Phase 3.2 is ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Offer draw endpoint not implemented yet",
      });
    }),

  // Accept draw (future - Phase 3.2)
  acceptDraw: protectedProcedure
    .input(z.object({ gameId: z.uuidv7() }))
    .mutation(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // TODO: Implement when Phase 3.2 is ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Accept draw endpoint not implemented yet",
      });
    }),
});
