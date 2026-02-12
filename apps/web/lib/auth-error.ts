/**
 * Detect Convex/auth errors that should trigger redirect to login.
 * Shared between error boundary and any client-side auth handling.
 */
export function isConvexAuthError(error: unknown): boolean {
  const message =
    // oxlint-disable-next-line no-nested-ternary
    error instanceof Error
      ? error.message
      : // oxlint-disable-next-line unicorn/no-nested-ternary
        typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  return (
    /not authenticated/i.test(message) ||
    /authentication required/i.test(message) ||
    /unauthorized/i.test(message)
  );
}
