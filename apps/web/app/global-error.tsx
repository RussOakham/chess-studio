"use client";

/**
 * Minimal global error boundary. Replaces root layout when a fatal error occurs.
 * Kept dependency-free (no app providers) so prerender does not run useContext
 * in a context-free tree (Next.js 16 prerender bug).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <h1>Something went wrong</h1>
        <p>{error.message ?? "An unexpected error occurred."}</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
