"use client";

import {
  SegmentError,
  SegmentErrorHomeLink,
} from "@/components/ui/segment-error";
import { useEffect } from "react";

export default function AuthSegmentError({
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
      title="Sign-in ran into a problem"
      description="Try again. You can also return home and start over."
      error={error}
      onReset={reset}
      extraActions={
        <SegmentErrorHomeLink href="/login">Sign in</SegmentErrorHomeLink>
      }
    />
  );
}
