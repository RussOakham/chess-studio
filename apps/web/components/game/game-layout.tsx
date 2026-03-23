import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { ReactNode } from "react";

export type GameLayoutVariant = "default" | "dense";

/**
 * Two-column game/review layout: board column + sidebar. Matches review page flex
 * constraints so the board and side panel stay within the viewport.
 */
function GameLayoutRoot({
  className,
  children,
  /** When set, enables scoped "studio" theme tokens via `data-game-surface`. */
  gameSurface = false,
}: {
  className?: string;
  children: ReactNode;
  gameSurface?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-background",
        className
      )}
      data-game-surface={gameSurface ? "" : undefined}
    >
      {children}
    </div>
  );
}

function GameLayoutMain({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: ReactNode;
  /** `dense`: tighter padding and gaps so the board column uses more viewport. */
  variant?: GameLayoutVariant;
}) {
  return (
    <main
      className={cn(
        "flex max-h-full min-h-0 flex-1 flex-col overflow-hidden",
        variant === "dense"
          ? "gap-3 p-2 md:p-3 lg:flex-row lg:gap-4 lg:p-3"
          : "gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6",
        className
      )}
    >
      {children}
    </main>
  );
}

function GameBoardColumn({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex max-h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:min-h-full",
        className
      )}
    >
      {children}
    </div>
  );
}

function GameSidebarColumn({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: ReactNode;
  /** `dense`: wider analysis rail (Chess.com-style density). */
  variant?: GameLayoutVariant;
}) {
  return (
    <div
      className={cn(
        "flex max-h-full min-h-0 w-full flex-1 flex-col overflow-hidden",
        variant === "dense"
          ? "gap-3 lg:w-auto lg:max-w-xl lg:min-w-[min(100%,28rem)] lg:shrink-0 xl:max-w-2xl"
          : "gap-4 lg:w-auto lg:max-w-md",
        className
      )}
    >
      {children}
    </div>
  );
}

function GameBoardArea({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
        className
      )}
    >
      {children}
    </div>
  );
}

const GameBoardSquare = forwardRef<
  HTMLDivElement,
  { className?: string; children: ReactNode }
>(function GameBoardSquare({ className, children }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex aspect-square h-full max-w-full items-center justify-center",
        className
      )}
    >
      {children}
    </div>
  );
});

export {
  GameBoardArea,
  GameBoardColumn,
  GameBoardSquare,
  GameLayoutMain,
  GameLayoutRoot,
  GameSidebarColumn,
};
