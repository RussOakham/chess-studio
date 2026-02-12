// Server helpers for Convex + Better Auth (SSR, getToken, proxy handler)

import { api } from "@/convex/_generated/api";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl || !convexSiteUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL must be set in .env.local"
  );
}

/** Convex + Better Auth server helpers (preloadAuthQuery, fetchAuthQuery, fetchAuthMutation, fetchAuthAction, isAuthenticated). */
const authServer: ReturnType<typeof convexBetterAuthNextJs> =
  convexBetterAuthNextJs({
    convexUrl,
    convexSiteUrl,
  });

const { getToken, handler } = authServer;

/** Session-like shape for server code that previously used auth.api.getSession(). */
interface ServerSession {
  user: { id: string; name: string; email: string; image?: string | null };
}

/** Get current user from Convex auth for server components and API. Returns null if not signed in. */
async function getSession(): Promise<ServerSession | null> {
  const user = (await authServer.fetchAuthQuery(api.auth.getCurrentUser)) as {
    _id: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  if (!user) {
    return null;
  }
  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    },
  };
}

export { authServer, getToken, handler, getSession };
export type { ServerSession };
