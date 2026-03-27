"use client";

import { LoadingSpinner } from "@/components/ui/page-loading";
import { api } from "@/convex/_generated/api";
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
        title="Convex auth"
      >
        <LoadingSpinner size="sm" />
        Convex: loading…
      </span>
    );
  }

  if (user === null) {
    return (
      <span className="text-xs text-muted-foreground" title="Convex auth">
        Convex: not signed in
      </span>
    );
  }

  return (
    <span
      className="text-xs text-muted-foreground"
      title="Signed in via Convex (Better Auth)"
    >
      Convex: {user.name || user.email}
    </span>
  );
}
