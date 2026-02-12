"use client";

import type { ReactNode } from "react";

import { ConvexAuthErrorBoundary } from "@/components/auth/convex-auth-error-boundary";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      <ConvexAuthErrorBoundary>{children}</ConvexAuthErrorBoundary>
    </ConvexBetterAuthProvider>
  );
}
