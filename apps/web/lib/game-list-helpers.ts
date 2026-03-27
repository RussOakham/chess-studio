import type { Doc } from "@/convex/_generated/dataModel";
import { gameList } from "@/lib/copy";

/** Game status union from schema; use for exhaustive switch. */
type GameStatus = Doc<"games">["status"];

const STATUS = gameList.status;

const ACTIVE_STATUSES = ["in_progress", "waiting"] as const;
const RECENT_STATUSES = ["completed", "abandoned"] as const;

/** True if game is in_progress or waiting. */
function isActive(status: string): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

/** True if game is completed or abandoned (for "recent" lists). */
function isRecent(status: string): boolean {
  return (RECENT_STATUSES as readonly string[]).includes(status);
}

/**
 * Format game result or status for badge display (e.g. "White Wins", "In Progress").
 */
function formatBadgeText(game: Doc<"games">): string {
  if (game.result) {
    return game.result
      .replaceAll("_", " ")
      .replaceAll(/\b\w/g, (letter: string) => letter.toUpperCase());
  }
  if (game.status === "completed") {
    return STATUS.draw;
  }
  if (game.status === "in_progress") {
    return STATUS.inProgress;
  }
  if (game.status === "waiting") {
    return STATUS.waiting;
  }
  return STATUS.abandoned;
}

/**
 * Short status label for game cards (e.g. "In Progress", "Completed").
 */
function getStatusLabel(status: GameStatus): string {
  switch (status) {
    case "in_progress": {
      return STATUS.inProgress;
    }
    case "waiting": {
      return STATUS.waiting;
    }
    case "completed": {
      return STATUS.completed;
    }
    case "abandoned": {
      return STATUS.abandoned;
    }
    default: {
      const _never: never = status;
      void _never;
      return STATUS.abandoned;
    }
  }
}

/** Badge variant for status: default (in progress), secondary (completed), outline (other). */
function getBadgeVariant(
  status: GameStatus
): "default" | "secondary" | "outline" {
  switch (status) {
    case "in_progress": {
      return "default";
    }
    case "completed": {
      return "secondary";
    }
    case "waiting":
    case "abandoned": {
      return "outline";
    }
    default: {
      const _never: never = status;
      void _never;
      return "outline";
    }
  }
}

export {
  formatBadgeText,
  getBadgeVariant,
  getStatusLabel,
  isActive,
  isRecent,
  type GameStatus,
};
