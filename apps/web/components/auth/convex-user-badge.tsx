"use client";

import { LoadingSpinner } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/copy";
import { useQuery } from "convex/react";

/**
 * Phase 3: Convex hook test. Displays the current user from Convex (Better Auth)
 * to validate that auth token flows to Convex and getCurrentUser resolves.
 */
export function ConvexUserBadge() {
  const user = useQuery(api.auth.getCurrentUser);

  if (user === undefined) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        title={auth.convexDebug.loadingTitle}
      >
        <LoadingSpinner size="sm" />
        {auth.convexDebug.loadingBadge}
      </span>
    );
  }

  if (user === null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title={auth.convexDebug.notSignedInTitle}
      >
        {auth.convexDebug.notSignedIn}
      </span>
    );
  }

  return (
    <span
      className="text-xs text-muted-foreground"
      title={auth.convexDebug.signedInTitle}
    >
      {auth.convexDebug.signedInPrefix} {user.name || user.email}
    </span>
  );
}
