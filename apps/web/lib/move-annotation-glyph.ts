import type { MoveAnnotationType } from "@repo/chess";

/** Same glyphs as move list / timeline (single source of truth). */
function moveAnnotationGlyph(type: MoveAnnotationType): string {
  switch (type) {
    case "blunder": {
      return "??";
    }
    case "mistake": {
      return "?";
    }
    case "inaccuracy": {
      return "?!";
    }
    case "good": {
      return "!";
    }
    case "best": {
      return "!!";
    }
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

export { moveAnnotationGlyph };
