import type { Id } from "@/convex/_generated/dataModel";

/**
 * Coerce a string to Convex games table ID. Used for URL params and props;
 * Convex validates format and ownership at runtime.
 */
export function toGameId(value: string): Id<"games"> {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid game ID");
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- Runtime string from URL/props; Convex validates at API boundary
  return value as Id<"games">;
}

/** Conservative URL-param guard to avoid calling Convex with obvious non-IDs (e.g. styles.css.map). */
export function isPlausibleGameId(value: string): boolean {
  return /^[a-z0-9]+$/.test(value);
}
