import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Better Auth JWT subject for the current caller. Throws if not signed in.
 */
async function getAuthedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

/**
 * Throws if not authenticated, game missing, or caller does not own the game.
 */
async function requireOwnedGame(
  ctx: QueryCtx | MutationCtx,
  gameId: Id<"games">
): Promise<Doc<"games">> {
  const userId = await getAuthedUserId(ctx);
  const game = await ctx.db.get(gameId);
  if (game === null) {
    throw new Error("Game not found");
  }
  if (game.userId !== userId) {
    throw new Error("You do not have access to this game");
  }
  return game;
}

export { getAuthedUserId, requireOwnedGame };
