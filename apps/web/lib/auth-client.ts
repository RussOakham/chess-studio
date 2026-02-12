// Better Auth client with Convex plugin (auth runs on Convex)

"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Auth API base URL. Must be the app origin so token/session requests send
 * cookies (same-origin). Otherwise Convex queries get "Not authenticated".
 */
function getAuthBaseUrl(): string {
  if (typeof globalThis.window !== "undefined") {
    return globalThis.window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  fetchOptions: { credentials: "include" },
  plugins: [convexClient()],
});

const { signIn, signUp, signOut, useSession } = authClient;
export { authClient, signIn, signUp, signOut, useSession };
