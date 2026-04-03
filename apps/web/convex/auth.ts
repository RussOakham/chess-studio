/// <reference types="node" />

import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { v } from "convex/values";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import { authUserValidator } from "./validators";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error("SITE_URL must be set in environment variables");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in environment variables");
}

// GitHub OAuth must also be set on the Convex deployment (not only Next.js .env.local):
// `npx convex env set GITHUB_CLIENT_ID ...` and `GITHUB_CLIENT_SECRET`, or Dashboard → Settings → Env vars.
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;
const githubOAuthConfigured =
  typeof githubClientId === "string" &&
  githubClientId.length > 0 &&
  typeof githubClientSecret === "string" &&
  githubClientSecret.length > 0;

/** Session and JWT duration: 7 days so users don't get "Not authenticated" after a few minutes. */
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

const authComponent = createClient<DataModel>(components.betterAuth);

const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    session: {
      expiresIn: SEVEN_DAYS_SECONDS,
      updateAge: 24 * 60 * 60, // Refresh expiry when session is used (once per day)
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    ...(githubOAuthConfigured
      ? {
          socialProviders: {
            github: {
              clientId: githubClientId,
              clientSecret: githubClientSecret,
            },
          },
        }
      : {}),
    plugins: [
      convex({
        authConfig,
        jwt: { expirationSeconds: SEVEN_DAYS_SECONDS },
      }),
    ],
  });
};

const getCurrentUser = query({
  args: {},
  returns: v.union(authUserValidator, v.null()),
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

export { authComponent, createAuth, getCurrentUser };
