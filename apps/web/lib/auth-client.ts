// Better Auth client with Convex plugin (auth runs on Convex)

"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Auth API base URL. Must be the app origin so token/session requests send
 * cookies (same-origin). Otherwise Convex queries get "Not authenticated".
 *
 * On Vercel Preview, `NEXT_PUBLIC_SITE_URL` is often unset; `VERCEL_URL` is
 * always set (hostname only). Use it for SSR before `window` exists so OAuth
 * and `/api/auth/*` calls target the deployment host, not localhost.
 */
function getAuthBaseUrl(): string {
  if (typeof globalThis.window !== "undefined") {
    return globalThis.window.location.origin;
  }
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit;
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  fetchOptions: { credentials: "include" },
  plugins: [convexClient()],
});
