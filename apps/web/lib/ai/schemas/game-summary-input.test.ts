import {
  buildGameSummaryMessages,
  GAME_SUMMARY_PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompts/game-summary";
import {
  buildGameSummaryInput,
  gameSummaryInputSchema,
} from "@/lib/ai/schemas/game-summary-input";
import { z } from "zod";

const minimalGame = {
  difficulty: "strong" as const,
  color: "white" as const,
};

describe("gameSummaryInputSchema", () => {
  it("rejects empty rule-based summary", () => {
    expect(() =>
      gameSummaryInputSchema.parse({
        ruleBasedSummary: "",
        game: minimalGame,
      })
    ).toThrow(z.ZodError);
  });

  it("rejects unknown keys (strict)", () => {
    const payload: Record<string, unknown> = {
      ruleBasedSummary: "White had a slight edge.",
      game: minimalGame,
      extraField: "nope",
    };
    expect(() => gameSummaryInputSchema.parse(payload)).toThrow(z.ZodError);
  });

  it("accepts a minimal valid payload", () => {
    const parsed = gameSummaryInputSchema.parse({
      ruleBasedSummary: "Balanced game.",
      game: minimalGame,
    });
    expect(parsed.game.color).toBe("white");
  });
});

describe("buildGameSummaryInput", () => {
  it("maps review + game fields", () => {
    const dto = buildGameSummaryInput({
      review: {
        summary: "White pressed in the middlegame.",
        keyMoments: ["Move 12: d5 break"],
        moveAnnotations: [
          {
            moveNumber: 5,
            type: "inaccuracy",
            bestMoveSan: "Nf3",
          },
        ],
      },
      game: {
        result: "white_wins",
        difficulty: "club",
        color: "black",
        pgn: "1. e4 e5",
      },
    });
    expect(dto.ruleBasedSummary).toContain("middlegame");
    expect(dto.keyMoments).toHaveLength(1);
    expect(dto.game.result).toBe("white_wins");
  });
});

describe("buildGameSummaryMessages", () => {
  it("returns system + user roles and system prompt", () => {
    const input = buildGameSummaryInput({
      review: {
        summary: "Engine line: equal until endgame.",
      },
      game: {
        result: "draw",
        difficulty: "intermediate",
        color: "white",
      },
    });
    const messages = buildGameSummaryMessages(input);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toBe(SYSTEM_PROMPT);
    expect(messages[1]?.role).toBe("user");
  });

  it("includes grounded engine text in user message", () => {
    const input = buildGameSummaryInput({
      review: {
        summary: "Engine line: equal until endgame.",
      },
      game: {
        result: "draw",
        difficulty: "intermediate",
        color: "white",
      },
    });
    const messages = buildGameSummaryMessages(input);
    const userText = z.string().parse(messages[1]?.content);
    expect(userText).toContain("Engine overview");
    expect(userText).toContain("equal until endgame");
    expect(userText).toContain("Draw");
  });

  it("exports a stable prompt version", () => {
    expect(GAME_SUMMARY_PROMPT_VERSION).toBe(1);
  });
});
