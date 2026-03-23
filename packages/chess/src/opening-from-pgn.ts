/**
 * Best-effort opening label from the first few SAN moves in a PGN string.
 */

const PREFIX_TO_NAME: { prefix: string; name: string }[] = [
  { prefix: "e4 e5 Nf3 Nc6 Bb5", name: "Ruy Lopez" },
  { prefix: "e4 e5 Nf3 Nc6 Bc4", name: "Italian Game" },
  { prefix: "e4 e5 Nf3 Nc6", name: "Open Game" },
  { prefix: "e4 c5", name: "Sicilian Defense" },
  { prefix: "e4 e6", name: "French Defense" },
  { prefix: "e4 c6", name: "Caro-Kann Defense" },
  { prefix: "d4 d5 c4", name: "Queen's Gambit" },
  { prefix: "d4 d5", name: "Queen's Pawn Game" },
  { prefix: "d4 Nf6 c4 e6", name: "Indian Defense" },
  { prefix: "d4 Nf6", name: "Indian Defense" },
  { prefix: "e4 e5", name: "King's Pawn Game" },
  { prefix: "e4", name: "King's Pawn Opening" },
  { prefix: "d4", name: "Queen's Pawn Opening" },
];

function stripHeaders(pgn: string): string {
  return pgn
    .split("\n")
    .filter((line) => !line.trim().startsWith("["))
    .join("\n");
}

/** Remove parenthetical variations; innermost pairs first so nesting is handled. */
function stripParentheticalVariations(text: string): string {
  let result = text;
  while (/\([^()]*\)/.test(result)) {
    result = result.replace(/\([^()]*\)/g, " ");
  }
  return result;
}

function extractSanPrefix(pgn: string, maxMoves: number): string {
  const body = stripHeaders(pgn);
  const tokens = stripParentheticalVariations(body.replace(/\{[^}]*\}/g, " "))
    .split(/\s+/)
    .filter(
      (token) =>
        token.length > 0 && !/^\d+\.{0,3}$/.test(token) && token !== "*"
    )
    .slice(0, maxMoves);
  return tokens.join(" ");
}

/**
 * Returns a human-readable opening name when the start of the game matches a known line.
 */
export function getOpeningLabelFromPgn(pgn: string | undefined): string | null {
  if (!pgn?.trim()) {
    return null;
  }
  const prefix = extractSanPrefix(pgn, 12);
  if (!prefix) {
    return null;
  }
  for (const { prefix: key, name } of PREFIX_TO_NAME) {
    if (prefix === key || prefix.startsWith(`${key} `)) {
      return name;
    }
  }
  return null;
}
