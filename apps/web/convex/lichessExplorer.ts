"use node";

import { v } from "convex/values";

import { fenForExplorerCacheKey } from "../lib/lichess/fen-for-explorer-cache";
import { fetchOpeningExplorerMasters } from "../lib/lichess/fetch-opening-explorer";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BATCH = 32;
const BETWEEN_FETCH_MS = 120;

function cacheKeyForFen(fen: string): string {
  return `${fenForExplorerCacheKey(fen)}|masters`;
}

/**
 * Batch-fetch masters explorer stats for positions (auth required).
 * Uses Convex cache with TTL; respects fair-use spacing between upstream calls.
 */
const batchExplorerMasters = action({
  args: { fens: v.array(v.string()) },
  returns: v.array(
    v.object({
      cacheKey: v.string(),
      payloadJson: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const fens = args.fens.slice(0, MAX_BATCH);
    const uniqueKeys = new Map<string, string>();
    for (const fen of fens) {
      const key = cacheKeyForFen(fen);
      if (!uniqueKeys.has(key)) {
        uniqueKeys.set(key, fen);
      }
    }

    const results: { cacheKey: string; payloadJson: string | null }[] = [];
    const now = Date.now();

    for (const [cacheKey, fen] of uniqueKeys) {
      const cached = await ctx.runQuery(
        internal.lichessExplorerCache.getEntry,
        {
          cacheKey,
        }
      );
      if (cached !== null && now - cached.fetchedAt < CACHE_TTL_MS) {
        results.push({ cacheKey, payloadJson: cached.payloadJson });
        continue;
      }

      try {
        const data = await fetchOpeningExplorerMasters(fen);
        const json = JSON.stringify(data);
        await ctx.runMutation(internal.lichessExplorerCache.upsertEntry, {
          cacheKey,
          payloadJson: json,
          fetchedAt: now,
        });
        results.push({ cacheKey, payloadJson: json });
      } catch {
        results.push({ cacheKey, payloadJson: null });
      }

      await new Promise<void>((resolve) => {
        setTimeout(resolve, BETWEEN_FETCH_MS);
      });
    }

    return results;
  },
});

export { batchExplorerMasters };
