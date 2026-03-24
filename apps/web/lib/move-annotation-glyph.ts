import type { MoveAnnotationType } from "@repo/chess";

/** Text glyphs for engine classes (book moves use `MoveAnnotationGlyph` + Lucide icon). */
function moveAnnotationTextGlyph(
  type: Exclude<MoveAnnotationType, "book">
): string {
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

export { moveAnnotationTextGlyph };
