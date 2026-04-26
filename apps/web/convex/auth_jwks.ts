import { v } from "convex/values";

import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";

interface DeleteManyJwksResult {
  count: number;
  isDone: boolean;
  continueCursor: string | null;
}

function isDeleteManyJwksResult(value: unknown): value is DeleteManyJwksResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const count: unknown = Reflect.get(value, "count");
  const isDone: unknown = Reflect.get(value, "isDone");
  const continueCursor: unknown = Reflect.get(value, "continueCursor");
  return (
    typeof count === "number" &&
    typeof isDone === "boolean" &&
    (typeof continueCursor === "string" || continueCursor === null)
  );
}

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
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    let cursor: string | null = null;
    let totalDeleted = 0;
    for (;;) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- pagination loop is inherently sequential
      const resultUnknown: unknown = await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: {
            model: "jwks" as const,
            where: [],
          },
          paginationOpts: {
            numItems: 100,
            cursor,
          },
        }
      );
      if (!isDeleteManyJwksResult(resultUnknown)) {
        throw new Error("Unexpected deleteMany JWKS response shape");
      }
      const result = resultUnknown;
      totalDeleted += result.count;
      if (result.isDone) {
        break;
      }
      cursor = result.continueCursor;
    }
    return { deleted: totalDeleted };
  },
});
