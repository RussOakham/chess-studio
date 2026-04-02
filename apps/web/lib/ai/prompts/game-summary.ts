import type { GameSummaryInput } from "@/lib/ai/schemas/game-summary-input";
import type { ModelMessage } from "ai";

/**
 * Bump when the Zod DTO shape or prompt instructions change materially
 * (stored in `aiSummaryMeta.promptVersion`).
 */
const GAME_SUMMARY_PROMPT_VERSION = 1;

const SYSTEM_PROMPT = `You are a chess coach writing a short post-game narrative for a student.

Rules:
- Use ONLY the facts given below (engine summary, annotations, opening name, game result). Do not invent variations, best moves, or evaluations that are not supported by the data.
- If the data is sparse, say less rather than guessing.
- Do not contradict the engine-classified moments or move labels.
- Write in clear Markdown (headings optional, short paragraphs).`;

function formatUserContent(input: GameSummaryInput): string {
  const lines: string[] = [
    "## Context",
    "",
    `- Result: ${formatResult(input.game.result)}`,
    `- Human played as: ${input.game.color}`,
    `- Game strength preset: ${input.game.difficulty}`,
  ];

  if (input.openingNameLichess !== undefined) {
    lines.push(`- Opening (Lichess line): ${input.openingNameLichess}`);
  }

  if (input.game.pgn !== undefined && input.game.pgn.length > 0) {
    lines.push("", "## PGN", "", "```", input.game.pgn, "```");
  } else if (input.game.fen !== undefined && input.game.fen.length > 0) {
    lines.push("", "## Final position (FEN)", "", input.game.fen);
  }

  lines.push(
    "",
    "## Engine overview (authoritative — do not contradict)",
    "",
    input.ruleBasedSummary
  );

  if (input.keyMoments !== undefined && input.keyMoments.length > 0) {
    lines.push("", "## Key moments", "");
    for (const km of input.keyMoments) {
      lines.push(`- ${km}`);
    }
  }

  if (input.suggestions !== undefined && input.suggestions.length > 0) {
    lines.push("", "## Suggestions (from analysis)", "");
    for (const suggestion of input.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  if (input.moveAnnotations !== undefined && input.moveAnnotations.length > 0) {
    lines.push("", "## Move annotations (engine)", "");
    for (const annotation of input.moveAnnotations) {
      lines.push(formatAnnotationLine(annotation));
    }
  }

  return lines.join("\n");
}

function formatResult(result: GameSummaryInput["game"]["result"]): string {
  if (result === undefined) {
    return "unknown / not recorded";
  }
  switch (result) {
    case "white_wins": {
      return "White won";
    }
    case "black_wins": {
      return "Black won";
    }
    case "draw": {
      return "Draw";
    }
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

type MoveAnnotationRow = NonNullable<
  GameSummaryInput["moveAnnotations"]
>[number];

function formatAnnotationLine(annotation: MoveAnnotationRow): string {
  const parts = [`Move ${String(annotation.moveNumber)}: ${annotation.type}`];
  if (annotation.bestMoveSan !== undefined) {
    parts.push(`(engine best: ${annotation.bestMoveSan})`);
  }
  if (annotation.bookOpeningName !== undefined) {
    parts.push(`book: ${annotation.bookOpeningName}`);
  }
  return `- ${parts.join(" ")}`;
}

/**
 * Model messages for `generateText` / `streamText` — no network I/O.
 */
function buildGameSummaryMessages(input: GameSummaryInput): ModelMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: formatUserContent(input) },
  ];
}

export { buildGameSummaryMessages, GAME_SUMMARY_PROMPT_VERSION, SYSTEM_PROMPT };
