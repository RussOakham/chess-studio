import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

const trpc = initTRPC.context<Context>().create();

// Base router and procedure
const { router } = trpc;
const publicProcedure = trpc.procedure;

// Protected procedure (requires authentication)
const protectedProcedure = trpc.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});

export { router, publicProcedure, protectedProcedure };
