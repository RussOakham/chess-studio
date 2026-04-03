"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { github } from "@/lib/copy";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ComponentProps, ReactElement } from "react";

/** GitHub mark (Lucide v1+ omits brand icons). */
function GitHubMark({
  className,
  ...props
}: ComponentProps<"svg">): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
      {...props}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.9c.58.11.79-.25.79-.55l-.01-2.05c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.72 1.26 3.38.96.1-.75.41-1.26.74-1.55-2.55-.29-5.23-1.28-5.23-5.74 0-1.27.45-2.31 1.2-3.12-.12-.3-.52-1.52.09-3.18 0 0 .98-.31 3.2 1.2a11 11 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.22-1.52 3.2-1.2 3.2-1.2.61 1.66.22 2.88.11 3.18.75.81 1.19 1.85 1.19 3.12 0 4.47-2.69 5.44-5.26 5.73.42.36.8 1.08.8 2.18l-.01 3.23c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

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
    /** If true, full-page navigation is in progress — do not clear `pending` in `finally` or the button flickers back before unload. */
    let navigatingToOAuth = false;
    try {
      const result = await authClient.signIn.social({
        provider: "github",
        callbackURL: resolvedCallback,
      });

      if (result.error) {
        setOauthError(result.error.message ?? github.errors.failedSignIn);
        return;
      }

      const url = result.data?.url;
      if (typeof url === "string" && url.length > 0) {
        navigatingToOAuth = true;
        globalThis.location.assign(url);
        return;
      }
      setOauthError(github.errors.failedStart);
    } catch (error: unknown) {
      setOauthError(
        error instanceof Error ? error.message : github.errors.generic
      );
    } finally {
      if (!navigatingToOAuth) {
        setPending(false);
      }
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            {github.divider}
          </span>
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
        <GitHubMark className="mr-2 size-4" />
        {pending ? github.connecting : github.continueWithGithub}
      </Button>
    </div>
  );
}
