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

function parseMoveRow(
  row: Record<string, unknown>
): ExplorerMastersResponse["moves"][number] | null {
  const { uci } = row;
  const { san } = row;
  const whiteCount = row.white;
  const drawCount = row.draws;
  const blackCount = row.black;
  if (
    typeof uci !== "string" ||
    typeof san !== "string" ||
    typeof whiteCount !== "number" ||
    typeof drawCount !== "number" ||
    typeof blackCount !== "number"
  ) {
    return null;
  }
  return {
    uci,
    san,
    white: whiteCount,
    draws: drawCount,
    black: blackCount,
    opening: parseOpening(row.opening),
  };
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
    if (isRecord(row)) {
      const parsed = parseMoveRow(row);
      if (parsed !== null) {
        moves.push(parsed);
      }
    }
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
