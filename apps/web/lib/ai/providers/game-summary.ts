import {
  AI_GENERATE_TIMEOUT_MS,
  AI_SUMMARY_MAX_OUTPUT_TOKENS,
  getAiSummaryModelId,
} from "@/lib/ai/config";
import { buildGameSummaryMessages } from "@/lib/ai/prompts/game-summary";
import type { GameSummaryInput } from "@/lib/ai/schemas/game-summary-input";
import {
  createGateway,
  GatewayAuthenticationError,
  GatewayError,
  GatewayRateLimitError,
} from "@ai-sdk/gateway";
import { generateText } from "ai";
import type { LanguageModelUsage } from "ai";

function getGatewayOrThrow() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "AI_GATEWAY_API_KEY is not configured for AI summary generation"
    );
  }
  return createGateway({ apiKey });
}

function mapGatewayGenerateError(error: unknown): never {
  if (GatewayAuthenticationError.isInstance(error)) {
    throw new Error(
      "AI Gateway authentication failed. Check AI_GATEWAY_API_KEY.",
      { cause: error }
    );
  }
  if (GatewayRateLimitError.isInstance(error)) {
    throw new Error("AI summary rate limit reached. Try again later.", {
      cause: error,
    });
  }
  if (GatewayError.isInstance(error) && error.type === "timeout_error") {
    throw new Error("AI summary request timed out. Try again.", {
      cause: error,
    });
  }
  throw error;
}

async function generateTextWithMappedErrors(
  params: Parameters<typeof generateText>[0]
): Promise<Awaited<ReturnType<typeof generateText>>> {
  try {
    return await generateText(params);
  } catch (error) {
    mapGatewayGenerateError(error);
  }
}

interface GameSummaryGenerateResult {
  text: string;
  usage: LanguageModelUsage;
}

/**
 * Calls Vercel AI Gateway via AI SDK. Intended for Convex `"use node"` actions only.
 */
async function generateGameSummary(
  input: GameSummaryInput
): Promise<GameSummaryGenerateResult> {
  const gateway = getGatewayOrThrow();
  const model = gateway(getAiSummaryModelId());
  const messages = buildGameSummaryMessages(input);

  const result = await generateTextWithMappedErrors({
    model,
    messages,
    maxOutputTokens: AI_SUMMARY_MAX_OUTPUT_TOKENS,
    timeout: AI_GENERATE_TIMEOUT_MS,
  });

  const trimmed = result.text.trim();
  if (trimmed.length === 0) {
    throw new Error("AI summary generation returned empty text");
  }

  return { text: trimmed, usage: result.usage };
}

export { generateGameSummary, type GameSummaryGenerateResult };
