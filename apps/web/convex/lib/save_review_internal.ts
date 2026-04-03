import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Internal: upsert game review after auth and validation. */
export async function saveReviewInternal(
  ctx: MutationCtx,
  gameId: Id<"games">,
  payload: {
    summary: string;
    evaluations: number[];
    keyMoments: string[];
    suggestions: string[];
    moveAnnotations: {
      moveNumber: number;
      type: "blunder" | "mistake" | "inaccuracy" | "good" | "best" | "book";
      bestMoveSan?: string;
      bestMoveUci?: string;
      bookOpeningEco?: string;
      bookOpeningName?: string;
    }[];
    /** `undefined` = leave unchanged; `null` = clear stored value. */
    openingNameLichess?: string | null;
  }
): Promise<Id<"game_reviews">> {
  const now = Date.now();
  const existing = await ctx.db
    .query("game_reviews")
    .withIndex("by_gameId", (indexQuery) => indexQuery.eq("gameId", gameId))
    .unique();

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      summary: payload.summary,
      evaluations: payload.evaluations,
      keyMoments: payload.keyMoments,
      suggestions: payload.suggestions,
      moveAnnotations: payload.moveAnnotations,
      ...(payload.openingNameLichess !== undefined
        ? {
            openingNameLichess:
              payload.openingNameLichess === null
                ? undefined
                : payload.openingNameLichess,
          }
        : {}),
    });
    return existing._id;
  }

  return await ctx.db.insert("game_reviews", {
    gameId,
    summary: payload.summary,
    evaluations: payload.evaluations,
    keyMoments: payload.keyMoments,
    suggestions: payload.suggestions,
    moveAnnotations: payload.moveAnnotations,
    ...(payload.openingNameLichess !== undefined &&
    payload.openingNameLichess !== null
      ? { openingNameLichess: payload.openingNameLichess }
      : {}),
    createdAt: now,
  });
}
