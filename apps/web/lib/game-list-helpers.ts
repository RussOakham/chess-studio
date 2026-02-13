import type { Doc } from "@/convex/_generated/dataModel";

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
    return "Draw";
  }
  if (game.status === "in_progress") {
    return "In Progress";
  }
  if (game.status === "waiting") {
    return "Waiting";
  }
  return "Abandoned";
}

/**
 * Short status label for game cards (e.g. "In Progress", "Completed").
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case "in_progress": {
      return "In Progress";
    }
    case "waiting": {
      return "Waiting";
    }
    case "completed": {
      return "Completed";
    }
    default: {
      return "Abandoned";
    }
  }
}

/** Badge variant for status: default (in progress), secondary (completed), outline (other). */
function getBadgeVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "in_progress") {
    return "default";
  }
  if (status === "completed") {
    return "secondary";
  }
  return "outline";
}

export { formatBadgeText, getBadgeVariant, getStatusLabel, isActive, isRecent };
