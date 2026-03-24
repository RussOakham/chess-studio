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
  /** Engine best move in UCI (e.g. `e2e4`, `e7e8q`) for reliable board overlays. */
  bestMoveUci?: string;
}

export type { MoveAnnotation, MoveAnnotationType };
