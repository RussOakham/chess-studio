"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PlayerStripProps {
  icon: LucideIcon;
  name: string;
  colorLabel: string;
  capturedSymbols: string[];
  /** Extra row content (e.g. status badges). */
  badges?: ReactNode;
  className?: string;
}

/**
 * Player row above/below the board (opponent or user): avatar slot, name, color, optional captures.
 */
export function PlayerStrip({
  icon: Icon,
  name,
  colorLabel,
  capturedSymbols,
  badges,
  className,
}: PlayerStripProps) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 flex-row gap-3 rounded-md border border-border bg-muted/30 px-3 py-2",
        className
      )}
    >
      <div
        className="flex min-w-10 shrink-0 items-center justify-center self-stretch rounded-md bg-muted text-muted-foreground"
        aria-hidden
      >
        <Icon className="size-5" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-foreground">{name}</span>
          <span className="text-sm text-muted-foreground">{colorLabel}</span>
          {badges}
        </div>
        {capturedSymbols.length > 0 ? (
          <div
            className="flex flex-wrap items-center gap-1.5 leading-none"
            aria-label={`Captured: ${capturedSymbols.join(" ")}`}
          >
            {capturedSymbols.map((sym, pieceIdx) => (
              <span
                key={`${sym}-${pieceIdx}`}
                className="inline-flex min-w-[1.25rem] items-center justify-center text-[1.5rem] leading-none"
              >
                {sym}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
