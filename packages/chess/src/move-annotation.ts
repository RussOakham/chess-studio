/**
 * Engine-derived move quality labels stored on game reviews (Convex + UI).
 */

type MoveAnnotationType =
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "good"
  | "best";

interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
}

export type { MoveAnnotation, MoveAnnotationType };
