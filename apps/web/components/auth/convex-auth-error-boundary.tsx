"use client";

import type { ReactNode } from "react";

import { isConvexAuthError } from "@/lib/auth-error";
import { Component } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isAuthError: boolean;
}

/**
 * Catches Convex auth errors (e.g. "Not authenticated") and redirects to login
 * instead of breaking the app. Other errors display a generic fallback with a
 * Retry button.
 */
export class ConvexAuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, isAuthError: false };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      hasError: true,
      isAuthError: isConvexAuthError(error),
    };
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (
      this.state.hasError &&
      this.state.isAuthError &&
      !prevState.isAuthError &&
      typeof globalThis.window !== "undefined"
    ) {
      const path = globalThis.window.location.pathname;
      const { search } = globalThis.window.location;
      const redirect = path + search;
      const loginUrl =
        redirect && redirect !== "/"
          ? `/login?redirect=${encodeURIComponent(redirect)}`
          : "/login";
      globalThis.window.location.assign(loginUrl);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        return (
          <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
            Redirecting to sign in…
          </div>
        );
      }
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-destructive">
          <p>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={() => {
              // Intentional: reset boundary state so children can re-render
              // eslint-disable-next-line react/no-set-state -- Retry resets boundary
              this.setState({ hasError: false, isAuthError: false });
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }

  override componentDidCatch(): void {
    // Error already captured in state via getDerivedStateFromError
  }
}
