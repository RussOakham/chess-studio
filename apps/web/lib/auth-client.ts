// Better Auth client with Convex plugin (auth runs on Convex)

"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient({
  plugins: [convexClient()],
});

const { signIn, signUp, signOut, useSession } = authClient;
export { authClient, signIn, signUp, signOut, useSession };
