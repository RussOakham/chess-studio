import { buildGameSummaryInput } from "@/lib/ai/schemas/game-summary-input";
/* eslint-disable vitest/prefer-import-in-mock, vitest/prefer-called-times, @typescript-eslint/no-unsafe-type-assertion, jest/no-untyped-mock-factory -- partial `ai` module mock */
import { GatewayRateLimitError } from "@ai-sdk/gateway";
import type { LanguageModelUsage } from "ai";
import { generateText } from "ai";

import { generateGameSummary } from "./game-summary";

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

function fakeGenerateTextResult(text: string, usage: LanguageModelUsage) {
  return {
    text,
    usage,
  } as unknown as Awaited<ReturnType<typeof generateText>>;
}

function fakeUsage(
  overrides: Partial<LanguageModelUsage> = {}
): LanguageModelUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    ...overrides,
  };
}

const minimalDto = buildGameSummaryInput({
  review: { summary: "Equal position throughout." },
  game: { difficulty: "strong", color: "white" },
});

describe("generateGameSummary", () => {
  it("returns trimmed text and usage from generateText", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
    vi.mocked(generateText).mockReset();
    vi.mocked(generateText).mockResolvedValue(
      fakeGenerateTextResult(
        "  A calm draw.  ",
        fakeUsage({
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        })
      )
    );

    const result = await generateGameSummary(minimalDto);

    expect(result.text).toBe("A calm draw.");
    expect(result.usage.totalTokens).toBe(150);
    expect(generateText).toHaveBeenCalledOnce();
    const call = vi.mocked(generateText).mock.calls[0]?.[0];
    expect(call?.maxOutputTokens).toBeDefined();
    expect(call?.timeout).toBeDefined();
  });

  it("throws when generateText returns only whitespace", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
    vi.mocked(generateText).mockReset();
    vi.mocked(generateText).mockResolvedValue(
      fakeGenerateTextResult(
        "   \n\t  ",
        fakeUsage({
          inputTokens: 1,
          outputTokens: 0,
          totalTokens: 1,
        })
      )
    );

    await expect(generateGameSummary(minimalDto)).rejects.toThrow(
      /empty text/i
    );
  });

  it("wraps gateway rate limit errors", async () => {
    process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
    vi.mocked(generateText).mockReset();
    vi.mocked(generateText).mockRejectedValue(new GatewayRateLimitError({}));

    await expect(generateGameSummary(minimalDto)).rejects.toThrow(
      /rate limit/i
    );
  });

  it("throws when AI_GATEWAY_API_KEY is missing", async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    vi.mocked(generateText).mockReset();

    await expect(generateGameSummary(minimalDto)).rejects.toThrow(
      /AI_GATEWAY_API_KEY/
    );
  });
});
