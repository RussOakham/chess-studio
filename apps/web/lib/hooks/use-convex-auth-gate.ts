"use client";

import { useConvexAuth } from "convex/react";
import { useEffect } from "react";

/**
 * Waits for Convex auth to resolve, skips authed queries until then, and sends
 * users to `/login` when there is no Convex session (expired JWT, missing token,
 * or OAuth misconfiguration). Server-side `getSession()` can succeed while the
 * client still lacks a valid Convex identity.
 */
export function useConvexAuthGate(): {
  authLoading: boolean;
  isAuthenticated: boolean;
} {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (authLoading || isAuthenticated) {
      return;
    }
    const path =
      globalThis.window.location.pathname + globalThis.window.location.search;
    const loginUrl =
      path && path !== "/"
        ? `/login?redirect=${encodeURIComponent(path)}`
        : "/login";
    globalThis.window.location.assign(loginUrl);
  }, [authLoading, isAuthenticated]);

  return { authLoading, isAuthenticated };
}
