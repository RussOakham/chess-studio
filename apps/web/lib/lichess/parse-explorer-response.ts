import type { ExplorerMastersResponse } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOpening(
  value: unknown
): { eco: string; name: string } | null | undefined {
  if (value === null || value === undefined) {
    return value;
  }
  if (!isRecord(value)) {
    return null;
  }
  const { eco } = value;
  const { name } = value;
  if (typeof eco !== "string" || typeof name !== "string") {
    return null;
  }
  return { eco, name };
}

/**
 * Parse JSON from Lichess masters explorer into a typed shape; throws if unusable.
 */
function parseExplorerMastersResponse(raw: unknown): ExplorerMastersResponse {
  if (!isRecord(raw)) {
    throw new Error("Lichess explorer: expected JSON object");
  }
  const { white } = raw;
  const { draws } = raw;
  const { black } = raw;
  const movesRaw = raw.moves;
  if (
    typeof white !== "number" ||
    typeof draws !== "number" ||
    typeof black !== "number" ||
    !Array.isArray(movesRaw)
  ) {
    throw new Error("Lichess explorer: missing white/draws/black/moves");
  }
  const moves: ExplorerMastersResponse["moves"] = [];
  for (const row of movesRaw) {
    if (!isRecord(row)) {
      continue;
    }
    const { uci } = row;
    const { san } = row;
    const w = row.white;
    const d = row.draws;
    const b = row.black;
    if (
      typeof uci !== "string" ||
      typeof san !== "string" ||
      typeof w !== "number" ||
      typeof d !== "number" ||
      typeof b !== "number"
    ) {
      continue;
    }
    moves.push({
      uci,
      san,
      white: w,
      draws: d,
      black: b,
      opening: parseOpening(row.opening),
    });
  }
  return {
    white,
    draws,
    black,
    moves,
    opening: parseOpening(raw.opening),
  };
}

export { parseExplorerMastersResponse };
