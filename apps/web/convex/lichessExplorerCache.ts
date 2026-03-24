import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";

const getEntry = internalQuery({
  args: { cacheKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      payloadJson: v.string(),
      fetchedAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("lichess_explorer_cache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
    if (row === null) {
      return null;
    }
    return { payloadJson: row.payloadJson, fetchedAt: row.fetchedAt };
  },
});

const upsertEntry = internalMutation({
  args: {
    cacheKey: v.string(),
    payloadJson: v.string(),
    fetchedAt: v.number(),
  },
  returns: v.id("lichess_explorer_cache"),
  handler: async (ctx, args): Promise<Id<"lichess_explorer_cache">> => {
    const existing = await ctx.db
      .query("lichess_explorer_cache")
      .withIndex("by_cacheKey", (q) => q.eq("cacheKey", args.cacheKey))
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        payloadJson: args.payloadJson,
        fetchedAt: args.fetchedAt,
      });
      return existing._id;
    }
    return await ctx.db.insert("lichess_explorer_cache", {
      cacheKey: args.cacheKey,
      payloadJson: args.payloadJson,
      fetchedAt: args.fetchedAt,
    });
  },
});

export { getEntry, upsertEntry };
