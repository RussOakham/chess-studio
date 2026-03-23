import { cn } from "@/lib/utils";
import { forwardRef } from "react";
import type { ReactNode } from "react";

/**
 * Two-column game/review layout: board column + sidebar. Matches review page flex
 * constraints so the board and side panel stay within the viewport.
 */
function GameLayoutRoot({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden bg-background",
        className
      )}
    >
      {children}
    </div>
  );
}

function GameLayoutMain({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <main
      className={cn(
        "flex max-h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:gap-6 lg:p-6",
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
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex max-h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden lg:w-auto lg:max-w-md",
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
