import type { PositionEvaluation } from "@repo/chess";

/**
 * Maps stored centipawn eval from analysis to `PositionEvaluation`.
 */
function cpToPositionEvaluation(cp: number): PositionEvaluation {
  return { type: "cp", value: cp };
}

/**
 * Evaluation for replay step: prefer stored per-move eval from review; index aligns with
 * `replayIndex` (1 = after first half-move → `storedEvaluations[0]`).
 */
function evaluationForReplayIndex(
  replayIndex: number,
  storedEvaluations: number[] | undefined
): PositionEvaluation | null {
  if (!storedEvaluations?.length || replayIndex < 1) {
    return null;
  }
  const idx = replayIndex - 1;
  const cp = storedEvaluations[idx];
  if (cp === undefined) {
    return null;
  }
  return cpToPositionEvaluation(cp);
}

export { cpToPositionEvaluation, evaluationForReplayIndex };
