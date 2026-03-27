"use client";

import {
  SegmentError,
  SegmentErrorHomeLink,
} from "@/components/ui/segment-error";
import { errors } from "@/lib/copy";
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
      title={errors.segment.main.title}
      description={errors.segment.main.description}
      error={error}
      onReset={reset}
      extraActions={<SegmentErrorHomeLink />}
    />
  );
}
