"use client";

import { common, errors } from "@/lib/copy";

/**
 * Minimal global error boundary. Replaces root layout when a fatal error occurs.
 * Kept free of React context providers so prerender does not run useContext
 * in a context-free tree (Next.js 16 prerender bug). String copy may import from `@/lib/copy`.
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
        <h1>{errors.global.title}</h1>
        <p>{error.message ?? errors.global.fallbackMessage}</p>
        <button type="button" onClick={() => reset()}>
          {common.actions.tryAgain}
        </button>
      </body>
    </html>
  );
}
