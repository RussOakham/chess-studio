"use client";

import { SegmentError } from "@/components/ui/segment-error";
import { isConvexAuthError } from "@/lib/auth-error";
import type { ReactNode } from "react";
import { useEffect } from "react";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

function AuthRedirectFallback() {
  useEffect(() => {
    if (typeof globalThis.window === "undefined") {
      return;
    }
    const path = globalThis.window.location.pathname;
    const { search } = globalThis.window.location;
    const redirect = path + search;
    const loginUrl =
      redirect && redirect !== "/"
        ? `/login?redirect=${encodeURIComponent(redirect)}`
        : "/login";
    globalThis.window.location.assign(loginUrl);
  }, []);

  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
      Redirecting to sign in…
    </div>
  );
}

function ConvexAuthFallback({ error, resetErrorBoundary }: FallbackProps) {
  if (isConvexAuthError(error)) {
    return <AuthRedirectFallback />;
  }

  return (
    <SegmentError
      title="Something went wrong"
      description="Please try again."
      error={error}
      fullScreen={false}
      onReset={resetErrorBoundary}
      resetLabel="Retry"
    />
  );
}

/**
 * Catches Convex auth errors (e.g. "Not authenticated") and redirects to login
 * instead of breaking the app. Other errors use the shared segment error UI with Retry.
 */
export function ConvexAuthErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ConvexAuthFallback}>
      {children}
    </ErrorBoundary>
  );
}
