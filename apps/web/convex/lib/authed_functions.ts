import {
  customAction,
  customCtx,
  customCtxAndArgs,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";

import { action, mutation, query } from "../_generated/server";
import { getAuthedUserId, requireOwnedGame } from "./game_access";

/**
 * Queries/mutations that require a signed-in user. Handlers receive `ctx.userId`
 * (Better Auth JWT subject).
 */
const authedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const userId = await getAuthedUserId(ctx);
    return { userId };
  })
);

const authedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const userId = await getAuthedUserId(ctx);
    return { userId };
  })
);

/**
 * Actions that require a signed-in user. Handlers receive `ctx.userId`
 * (Better Auth JWT subject). Use `v` validators for `args` when defining functions.
 */
const authedAction = customAction(
  action,
  customCtx(async (ctx) => {
    const userId = await getAuthedUserId(ctx);
    return { userId };
  })
);

/**
 * Queries/mutations scoped to a game the caller owns. Runs `requireOwnedGame`
 * once; handlers receive `ctx.game` plus args including `gameId`.
 */
const ownedGameQuery = customQuery(
  query,
  customCtxAndArgs({
    args: { gameId: v.id("games") },
    input: async (ctx, args) => {
      const game = await requireOwnedGame(ctx, args.gameId);
      return { ctx: { game }, args: { gameId: args.gameId } };
    },
  })
);

const ownedGameMutation = customMutation(
  mutation,
  customCtxAndArgs({
    args: { gameId: v.id("games") },
    input: async (ctx, args) => {
      const game = await requireOwnedGame(ctx, args.gameId);
      return { ctx: { game }, args: { gameId: args.gameId } };
    },
  })
);

export {
  authedAction,
  authedMutation,
  authedQuery,
  ownedGameMutation,
  ownedGameQuery,
};
