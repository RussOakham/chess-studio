import type { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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

const SANITIZED_GAME_ID_MAX_LEN = 100;

/**
 * Trim, escape newlines for safe one-line error text, cap length (no secrets).
 */
function sanitizeValueForGameIdError(raw: string): string {
  const trimmed = raw.trim();
  const escaped = trimmed.replace(/\r\n|\r|\n/g, String.raw`\\n`);
  return escaped.length > SANITIZED_GAME_ID_MAX_LEN
    ? `${escaped.slice(0, SANITIZED_GAME_ID_MAX_LEN)}…`
    : escaped;
}

/**
 * Parse and narrow to `Id<"games">` after Zod validation. Throws if invalid.
 */
function parseGameIdParam(value: string): Id<"games"> {
  const result = gameIdParamSchema.safeParse(value);
  if (!result.success) {
    const sanitizedValue = sanitizeValueForGameIdError(value);
    const validationMessage = fromZodError(result.error).message;
    throw new Error(
      `Invalid game ID: "${sanitizedValue}" - ${validationMessage}`
    );
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
