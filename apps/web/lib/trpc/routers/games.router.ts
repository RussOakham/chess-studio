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

  // Get game by ID (future)
  getById: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      console.log({
        input: input,
        ctx: ctx,
      });
      // Implementation when ready
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Not implemented yet",
      });
    }),
});
