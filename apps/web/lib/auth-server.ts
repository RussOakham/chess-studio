// Server helpers for Convex + Better Auth (SSR, getToken, proxy handler)

import { api } from "@/convex/_generated/api";
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
import { z } from "zod";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexUrl || !convexSiteUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL must be set in .env.local"
  );
}

/** Used by jwtCache to detect auth-related errors and avoid caching them. */
function isAuthError(error: unknown): boolean {
  let message = "";
  if (error instanceof Error) {
    const { message: msg } = error;
    message = msg;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    message = String((error as { message: unknown }).message);
  }
  return /auth/i.test(message);
}

/** Convex + Better Auth server helpers (preloadAuthQuery, fetchAuthQuery, fetchAuthMutation, fetchAuthAction, isAuthenticated). */
const authServer: ReturnType<typeof convexBetterAuthNextJs> =
  convexBetterAuthNextJs({
    convexUrl,
    convexSiteUrl,
    jwtCache: {
      enabled: true,
      isAuthError,
    },
  });

const { getToken, handler } = authServer;

/** Session-like shape for server code that previously used auth.api.getSession(). */
interface ServerSession {
  user: { id: string; name: string; email: string; image?: string | null };
}

const convexAuthUserSchema = z
  .object({
    _id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable().optional(),
  })
  .nullable();

/** Get current user from Convex auth for server components and API. Returns null if not signed in. */
async function getSession(): Promise<ServerSession | null> {
  const raw = await authServer.fetchAuthQuery(api.auth.getCurrentUser);
  const parsed = convexAuthUserSchema.safeParse(raw);
  if (!parsed.success || parsed.data === null) {
    return null;
  }
  const user = parsed.data;
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
