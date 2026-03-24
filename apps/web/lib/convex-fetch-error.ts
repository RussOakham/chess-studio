/**
 * Server-side Convex `fetchQuery` / `fetchAuthQuery` error helpers.
 * Avoid matching generic "404" in messages — transient HTTP errors can include "404"
 * and would incorrectly trigger Next.js `notFound()`.
 */
function extractConvexErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/** True when the game is missing or the user must not learn that it exists. */
function shouldNotFoundForGameLookup(message: string): boolean {
  return (
    /game not found/i.test(message) ||
    /you do not have access to this game/i.test(message)
  );
}

export { extractConvexErrorMessage, shouldNotFoundForGameLookup };
