import type { PositionEvaluation } from "@repo/chess";
import { Chess } from "chess.js";

/**
 * Tailwind classes for the eval pill: scores are from **White’s perspective**.
 * White-leaning → white pill / dark text; Black-leaning → black pill / light text (literal piece colours).
 */
function engineLineEvalPillClassName(ev: PositionEvaluation): string {
  let lean: "white" | "black" | "equal" = "equal";
  if (ev.value > 0) {
    lean = "white";
  } else if (ev.value < 0) {
    lean = "black";
  }

  switch (lean) {
    case "white": {
      return "border-neutral-300 bg-white text-neutral-950 dark:border-neutral-200 dark:bg-white dark:text-neutral-950";
    }
    case "black": {
      return "border-neutral-800 bg-neutral-950 text-white dark:border-neutral-700 dark:bg-black dark:text-white";
    }
    case "equal": {
      return "border-border bg-muted text-foreground";
    }
    default: {
      const _exhaustive: never = lean;
      return _exhaustive;
    }
  }
}

/** Format evaluation for the Analysis panel (cp as pawns, mate as #±N). */
function formatEngineLineEvaluation(ev: PositionEvaluation): string {
  if (ev.type === "mate") {
    if (ev.value > 0) {
      return `+#${String(ev.value)}`;
    }
    if (ev.value < 0) {
      return `-#${String(Math.abs(ev.value))}`;
    }
    return "#0";
  }
  const pawnsFromCp = ev.value / 100;
  return pawnsFromCp >= 0
    ? `+${pawnsFromCp.toFixed(2)}`
    : pawnsFromCp.toFixed(2);
}

/**
 * Play out UCI moves from FEN and return a space-separated SAN string (truncated by max plies).
 */
function uciPvToSanPrefix(
  fen: string,
  movesUci: string[],
  maxPlies: number
): string {
  try {
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      return "";
    }
    const parts: string[] = [];
    const limit = Math.min(movesUci.length, maxPlies);
    for (let plyIndex = 0; plyIndex < limit; plyIndex++) {
      const uci = movesUci[plyIndex];
      if (uci === undefined || uci.length < 4) {
        break;
      }
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      let played: ReturnType<Chess["move"]> | null = null;
      try {
        played = chess.move({
          from,
          to,
          promotion:
            promotion === "q" ||
            promotion === "r" ||
            promotion === "b" ||
            promotion === "n"
              ? promotion
              : undefined,
        });
      } catch {
        break;
      }
      if (played === null || played === undefined) {
        break;
      }
      parts.push(played.san);
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}

export {
  engineLineEvalPillClassName,
  formatEngineLineEvaluation,
  uciPvToSanPrefix,
};
