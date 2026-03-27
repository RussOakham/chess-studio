"use client";

import {
  SegmentError,
  SegmentErrorHomeLink,
} from "@/components/ui/segment-error";
import { useEffect } from "react";

export default function MainSegmentError({
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
      title="This part of the app crashed"
      description="Try again, or go home and come back. If it keeps happening, refresh the page."
      error={error}
      onReset={reset}
      extraActions={<SegmentErrorHomeLink />}
    />
  );
}
