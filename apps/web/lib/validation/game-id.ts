import type { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";

/**
 * URL / route segment pattern for Convex `games` document ids (alphanumeric, `_`, `-`).
 * Convex still validates ids and ownership at the API.
 */
const GAME_ID_URL_PARAM_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Zod schema for a plausible game id string from URLs or props (before Convex validates the id).
 */
const gameIdParamSchema = z
  .string()
  .regex(GAME_ID_URL_PARAM_REGEX, { message: "Invalid game ID" });

/**
 * Returns true if the value looks like a Convex games id segment (avoids obvious garbage in URLs).
 */
function isPlausibleGameId(value: string): boolean {
  return gameIdParamSchema.safeParse(value).success;
}

/**
 * Parse and narrow to `Id<"games">` after Zod validation. Throws if invalid.
 */
function parseGameIdParam(value: string): Id<"games"> {
  const result = gameIdParamSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Invalid game ID");
  }
  // eslint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- Branded after schema matches Convex id charset
  return result.data as Id<"games">;
}

export {
  GAME_ID_URL_PARAM_REGEX,
  gameIdParamSchema,
  isPlausibleGameId,
  parseGameIdParam,
};
