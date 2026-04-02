import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

type DeleteManyJwksResult = {
  count: number;
  isDone: boolean;
  continueCursor: string | null;
};

/**
 * Deletes all JWKS rows in the Better Auth component. Those keys are encrypted
 * with `BETTER_AUTH_SECRET`; after rotating the secret or fixing env drift, old
 * rows cannot be decrypted ("Failed to decrypt private key"). Clearing forces
 * new keys on the next JWT issuance. Users must sign in again.
 *
 * Dev: `npx convex run auth_jwks:clearJwks '{}' --push` (from `apps/web`)
 * Prod: same with `--prod`
 */
export const clearJwks = internalMutation({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    let totalDeleted = 0;
    for (;;) {
      const result = (await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: {
            model: "jwks",
            where: [],
          },
          paginationOpts: {
            numItems: 100,
            cursor,
          },
        }
      )) as DeleteManyJwksResult;
      totalDeleted += result.count;
      if (result.isDone) {
        break;
      }
      cursor = result.continueCursor;
    }
    return { deleted: totalDeleted };
  },
});
