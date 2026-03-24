import type { MoveAnnotationType } from "@repo/chess";

/** Same green as live move hints on the game page. */
const REVIEW_ENGINE_BEST_ARROW = "rgb(34, 197, 94)";

function playedMoveArrowColor(type: MoveAnnotationType): string {
  switch (type) {
    case "blunder": {
      return "rgb(220, 38, 38)";
    }
    case "mistake": {
      return "rgb(217, 119, 6)";
    }
    case "inaccuracy": {
      return "rgb(234, 88, 12)";
    }
    case "good":
    case "best":
    case "book": {
      return "rgb(148, 163, 184)";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export { REVIEW_ENGINE_BEST_ARROW, playedMoveArrowColor };
