/**
 * Game id helpers for URLs and Convex calls. Implementation lives in
 * {@link ./validation/game-id} (Zod); this module re-exports for stable import paths.
 */
export {
  gameIdParamSchema,
  isPlausibleGameId,
  parseGameIdParam,
  parseGameIdParam as toGameId,
} from "./validation/game-id";
