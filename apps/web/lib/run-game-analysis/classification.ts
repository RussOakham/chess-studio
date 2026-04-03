import type { MoveAnnotationType, PositionEvaluation } from "@repo/chess";

/** Centipawn equivalent for mate (for drop calculation). */
const MATE_CP = 10000;

/** Eval loss thresholds (centipawns) for suboptimal moves (tunable). */
const BLUNDER_CP = 300;
const MISTAKE_CP = 100;
/** Inaccuracy band: [INACCURACY_CP, MISTAKE_CP). */
const INACCURACY_CP = 40;
/** Below this, treat eval swing as noise → still "good". */
const GOOD_FLOOR_CP = 25;

export function evalToCp(ev: PositionEvaluation): number {
  if (ev.type === "cp") {
    return ev.value;
  }
  return ev.value > 0 ? MATE_CP : -MATE_CP;
}

/** Normalize UCI for comparison (e.g. "e7e8q" vs "e7e8q"). */
export function normalizeUci(uci: string): string {
  return uci.toLowerCase().trim();
}

export function classifySuboptimalMove(
  drop: number
): MoveAnnotationType | null {
  if (drop < GOOD_FLOOR_CP) {
    return null;
  }
  if (drop >= BLUNDER_CP) {
    return "blunder";
  }
  if (drop >= MISTAKE_CP) {
    return "mistake";
  }
  if (drop >= INACCURACY_CP) {
    return "inaccuracy";
  }
  return "good";
}
