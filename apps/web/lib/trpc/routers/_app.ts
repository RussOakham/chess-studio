import { router } from "../init";
import { gamesRouter } from "./games.router";

export const appRouter = router({
  games: gamesRouter,
});

export type AppRouter = typeof appRouter;
