"use client";

import {
  SegmentError,
  SegmentErrorHomeLink,
} from "@/components/ui/segment-error";
import { useEffect } from "react";

/**
 * Catches errors in the root layout subtree (below `RootLayout` providers).
 * For fatal root layout failures, see `global-error.tsx`.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SegmentError
      title="Something went wrong"
      description="An unexpected error occurred. You can try again or go back home."
      error={error}
      onReset={reset}
      extraActions={<SegmentErrorHomeLink />}
    />
  );
}
