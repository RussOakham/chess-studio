import { GamesRepository } from "@/lib/data-access/games.repository";
import { GamesService } from "@/lib/services/games.service";
import { newGameSchema } from "@/lib/validations/game";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { router, protectedProcedure } from "../init";

// Initialize service layer (reuse existing)
const repository = new GamesRepository();
const service = new GamesService(repository);

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
    .input(z.object({ gameId: z.string().uuid() }))
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

  // Make a move (future - Phase 2.1)
  makeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        from: z.string(),
        to: z.string(),
        promotion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // TODO: Implement when Phase 2.1 is ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Make move endpoint not implemented yet",
      });
    }),

  // Get engine move (future - Phase 2.3)
  getEngineMove: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // TODO: Implement when Phase 2.3 is ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Engine move endpoint not implemented yet",
      });
    }),

  // Resign game (future - Phase 3.2)
  resign: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
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
    .input(z.object({ gameId: z.string().uuid() }))
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
    .input(z.object({ gameId: z.string().uuid() }))
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
