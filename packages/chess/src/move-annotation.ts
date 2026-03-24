/**
 * Engine-derived move quality labels stored on game reviews (Convex + UI).
 */

type MoveAnnotationType =
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "good"
  | "best"
  /** Common in master/Lichess databases (opening explorer heuristic). */
  | "book";

interface MoveAnnotation {
  moveNumber: number;
  type: MoveAnnotationType;
  bestMoveSan?: string;
  /** Engine best move in UCI (e.g. `e2e4`, `e7e8q`) for reliable board overlays. */
  bestMoveUci?: string;
  /**
   * Lichess Opening Explorer line after this move (ECO + name) when in the
   * opening window and the API returns data — stored for every move type, not
   * only `book`.
   */
  bookOpeningEco?: string;
  bookOpeningName?: string;
}

export type { MoveAnnotation, MoveAnnotationType };
