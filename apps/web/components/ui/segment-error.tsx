"use client";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

function getDevMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

function getErrorDigest(error: unknown): string | undefined {
  if (error === null || typeof error !== "object") {
    return undefined;
  }
  const digestRaw: unknown = Reflect.get(error, "digest");
  return typeof digestRaw === "string" ? digestRaw : undefined;
}

interface SegmentErrorProps {
  /** Primary heading. */
  title: string;
  /** Short explanation shown under the title. */
  description?: string;
  /** Next.js `reset()` or `resetErrorBoundary()` — remounts the failed segment. */
  onReset: () => void;
  /** Label for the primary retry action. */
  resetLabel?: string;
  /**
   * When true, centers content in a viewport-height region (matches `PageLoading` fullScreen).
   * When false, a compact block for nested regions.
   */
  fullScreen?: boolean;
  /** Optional error for dev-only details / digest (matches route `error.tsx` / react-error-boundary). */
  error?: unknown;
  /** Extra actions beside the primary button (e.g. Link to home). */
  extraActions?: ReactNode;
  className?: string;
}

/**
 * Shared client UI for route `error.tsx` segments and in-app error surfaces.
 * Keep server-only modules out of this file.
 */
function SegmentError({
  title,
  description,
  onReset,
  resetLabel = "Try again",
  fullScreen = true,
  error,
  extraActions,
  className,
}: SegmentErrorProps) {
  const showDevDetails =
    process.env.NODE_ENV === "development" && error !== undefined;
  const devMessage = showDevDetails ? getDevMessage(error) : "";
  const digest = showDevDetails ? getErrorDigest(error) : undefined;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 p-6 text-center",
        fullScreen ? "min-h-[50vh] w-full sm:min-h-screen" : "w-full py-12",
        className
      )}
      role="alert"
    >
      <div className="flex max-w-md flex-col items-center gap-3">
        <AlertTriangle
          className="size-10 shrink-0 text-destructive"
          aria-hidden
        />
        <h1 className="font-serif text-2xl font-medium tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {showDevDetails ? (
          <pre className="max-h-32 w-full overflow-auto rounded-md border border-border bg-muted/50 p-3 text-left font-mono text-xs text-muted-foreground">
            {devMessage}
            {digest ? `\nDigest: ${digest}` : ""}
          </pre>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button type="button" onClick={onReset}>
            {resetLabel}
          </Button>
          {extraActions}
        </div>
      </div>
    </div>
  );
}

interface SegmentErrorHomeLinkProps {
  href?: string;
  children?: ReactNode;
}

/** Optional secondary navigation styled as outline button (client-only). */
function SegmentErrorHomeLink({
  href = "/",
  children = "Home",
}: SegmentErrorHomeLinkProps) {
  return (
    <Link href={href} className={buttonVariants({ variant: "outline" })}>
      {children}
    </Link>
  );
}

export type { SegmentErrorHomeLinkProps, SegmentErrorProps };
export { SegmentError, SegmentErrorHomeLink };
