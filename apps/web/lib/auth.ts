// Better Auth server configuration
// This module should only be imported once to prevent async local storage issues

import { db, schema } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is not set");
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL environment variable is not set");
}

// Create auth instance as a singleton to prevent multiple initializations
// This ensures Better Auth's async local storage works correctly
let authInstance: ReturnType<typeof betterAuth> | null = null;

function getAuth() {
  if (!authInstance) {
    authInstance = betterAuth({
      database: drizzleAdapter(db, {
        provider: "pg",
        // Use the exported schema object which includes all tables
        // Relations are already included in the db client's schema
        schema,
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // Set to true in production
      },
      experimental: {
        joins: true,
      },
      baseURL: process.env.BETTER_AUTH_URL,
      basePath: "/api/auth",
      secret: process.env.BETTER_AUTH_SECRET,
      plugins: [
        // NextCookies must be the last plugin in the array
        nextCookies(),
      ],
    });
  }
  return authInstance;
}

export const auth = getAuth();
