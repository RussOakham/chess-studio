"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { Github } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ReactElement } from "react";

/** Only allow same-origin relative paths (avoids open redirects). */
function sanitizeRedirectPath(value: string | null | undefined): string {
  if (
    value !== undefined &&
    value !== null &&
    value.length > 0 &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }
  return "/";
}

interface GitHubAuthSectionProps {
  callbackURL?: string;
  /**
   * When `true`, show the button (set from server when `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` exist).
   * When omitted, falls back to `NEXT_PUBLIC_GITHUB_AUTH_ENABLED=true`.
   */
  enabled?: boolean;
}

function resolveGithubSectionVisible(enabled: boolean | undefined): boolean {
  if (enabled === false) {
    return false;
  }
  if (enabled === true) {
    return true;
  }
  return process.env.NEXT_PUBLIC_GITHUB_AUTH_ENABLED === "true";
}

export function GitHubAuthSection({
  callbackURL,
  enabled: enabledProp,
}: GitHubAuthSectionProps): ReactElement | null {
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (!resolveGithubSectionVisible(enabledProp)) {
    return null;
  }

  const resolvedCallback = sanitizeRedirectPath(
    callbackURL ?? searchParams.get("redirect")
  );

  const handleGitHubSignIn = async (): Promise<void> => {
    setOauthError(null);
    setPending(true);
    try {
      const result = await signIn.social({
        provider: "github",
        callbackURL: resolvedCallback,
      });

      if (result.error) {
        setOauthError(result.error.message ?? "Failed to sign in with GitHub");
        return;
      }

      const url = result.data?.url;
      if (typeof url === "string" && url.length > 0) {
        globalThis.location.assign(url);
        return;
      }
      setOauthError("Failed to start GitHub sign-in. Please try again.");
    } catch (error: unknown) {
      setOauthError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      {oauthError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {oauthError}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => {
          void handleGitHubSignIn();
        }}
      >
        <Github className="mr-2 size-4" />
        {pending ? "Connecting…" : "Continue with GitHub"}
      </Button>
    </div>
  );
}
