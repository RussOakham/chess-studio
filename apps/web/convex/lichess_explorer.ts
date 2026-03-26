"use node";

import { setTimeout as delay } from "node:timers/promises";

import { v } from "convex/values";

import { fenForExplorerCacheKey } from "../lib/lichess/fen-for-explorer-cache";
import { fetchOpeningExplorerMasters } from "../lib/lichess/fetch-opening-explorer";
import { LICHESS_EXPLORER_MAX_FENS_PER_BATCH } from "../lib/lichess/lichess-explorer-batch";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BETWEEN_FETCH_MS = 120;

function cacheKeyForFen(fen: string): string {
  return `${fenForExplorerCacheKey(fen)}|masters`;
}

/**
 * Batch-fetch masters explorer stats for positions (auth required).
 * Uses Convex cache with TTL; respects fair-use spacing between upstream calls.
 * At most `LICHESS_EXPLORER_MAX_FENS_PER_BATCH` FENs per call — larger inputs throw (chunk on the client).
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

    const { fens } = args;
    if (fens.length > LICHESS_EXPLORER_MAX_FENS_PER_BATCH) {
      throw new Error(
        `batchExplorerMasters: received ${String(fens.length)} FENs; maximum per request is ${String(LICHESS_EXPLORER_MAX_FENS_PER_BATCH)}. Chunk calls on the client.`
      );
    }
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
        internal.lichess_explorer_cache.getEntry,
        {
          cacheKey,
        }
      );
      if (cached !== null && now - cached.fetchedAt < CACHE_TTL_MS) {
        results.push({ cacheKey, payloadJson: cached.payloadJson });
      } else {
        const data = await fetchOpeningExplorerMasters(fen);
        if (data === null) {
          await ctx.runMutation(internal.lichess_explorer_cache.upsertEntry, {
            cacheKey,
            payloadJson: null,
            fetchedAt: now,
          });
          results.push({ cacheKey, payloadJson: null });
        } else {
          const json = JSON.stringify(data);
          await ctx.runMutation(internal.lichess_explorer_cache.upsertEntry, {
            cacheKey,
            payloadJson: json,
            fetchedAt: now,
          });
          results.push({ cacheKey, payloadJson: json });
        }

        await delay(BETWEEN_FETCH_MS);
      }
    }

    return results;
  },
});

export { batchExplorerMasters };
