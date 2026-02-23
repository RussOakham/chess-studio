import type { GenericCtx } from "@convex-dev/better-auth";

import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { v } from "convex/values";

import type { DataModel } from "./_generated/dataModel";

import { components } from "./_generated/api";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL;
if (!siteUrl) {
  throw new Error("SITE_URL must be set in environment variables");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET must be set in environment variables");
}

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
    plugins: [
      convex({
        authConfig,
        jwt: { expirationSeconds: SEVEN_DAYS_SECONDS },
      }),
    ],
  });
};

// TODO: Replace with strict userValidator matching Better Auth user shape (id, email, name, etc.)
const getCurrentUser = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

export { authComponent, createAuth, getCurrentUser };
