"use client";

import {
  SegmentError,
  SegmentErrorHomeLink,
} from "@/components/ui/segment-error";
import { errors } from "@/lib/copy";
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
      title={errors.segment.auth.title}
      description={errors.segment.auth.description}
      error={error}
      onReset={reset}
      extraActions={
        <SegmentErrorHomeLink href="/login">
          {errors.segment.auth.signInLink}
        </SegmentErrorHomeLink>
      }
    />
  );
}
