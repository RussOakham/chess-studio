import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PageLoadingProps {
  /** Visible status line below the spinner. */
  message?: string;
  /**
   * When true, fills the viewport (auth routes, full-page Suspense).
   * When false, a compact centered block for lists and in-app regions.
   */
  fullScreen?: boolean;
  className?: string;
}

/**
 * Centered spinner + message for route transitions, Suspense fallbacks, and data loading.
 */
function PageLoading({
  message = "Loading…",
  fullScreen = false,
  className,
}: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-4",
        fullScreen ? "min-h-screen" : "w-full py-12",
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className="size-8 shrink-0 animate-spin text-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface LoadingSpinnerProps {
  className?: string;
  size?: "default" | "sm";
}

/** Small inline spinner for badges and buttons (pair with your own label). */
function LoadingSpinner({ className, size = "default" }: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn(
        "shrink-0 animate-spin text-muted-foreground",
        size === "sm" ? "size-3.5" : "size-4",
        className
      )}
      aria-hidden
    />
  );
}

export { LoadingSpinner, PageLoading };
