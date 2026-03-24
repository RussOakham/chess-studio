/**
 * HTTP client for Lichess Opening Explorer (masters DB).
 *
 * Host and paths follow the official OpenAPI spec. As of 2026, anonymous access
 * may return 401; set `LICHESS_API_TOKEN` (Personal Access Token) in the Convex
 * deployment for server-side requests.
 *
 * @see https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/masters.yaml
 */

import { parseExplorerMastersResponse } from "./parse-explorer-response";
import type { ExplorerMastersResponse } from "./types";

/** Default matches OpenAPI `servers[0].url` for the Opening Explorer. */
const DEFAULT_EXPLORER_BASE = "https://explorer.lichess.org";

function getExplorerBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env?.LICHESS_EXPLORER_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/u, "");
  }
  return DEFAULT_EXPLORER_BASE;
}

function getLichessToken(): string | undefined {
  if (typeof process !== "undefined" && process.env?.LICHESS_API_TOKEN) {
    const t = process.env.LICHESS_API_TOKEN.trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

function buildMastersUrl(fen: string): string {
  const base = getExplorerBaseUrl();
  const params = new URLSearchParams();
  params.set("fen", fen);
  params.set("moves", "16");
  return `${base}/masters?${params.toString()}`;
}

/** Optional User-Agent for fair use (Lichess request). */
const CLIENT_UA =
  "chess-studio/1.0 (+https://github.com/RussOakham/chess-studio)";

async function sleepMs(ms: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetch masters explorer for a position. Uses Bearer token when `LICHESS_API_TOKEN` is set.
 * Retries on 429 with exponential backoff.
 */
async function fetchOpeningExplorerMasters(
  fen: string,
  options?: { maxRetries?: number }
): Promise<ExplorerMastersResponse> {
  const maxRetries = options?.maxRetries ?? 3;
  const url = buildMastersUrl(fen);
  const token = getLichessToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": CLIENT_UA,
  };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }

  let delayMs = 800;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(url, { method: "GET", headers });
    if (res.status === 429 && attempt < maxRetries) {
      const jitter = Math.floor(Math.random() * 200);
      await sleepMs(delayMs + jitter);
      delayMs *= 2;
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Lichess explorer HTTP ${String(res.status)}: ${text.slice(0, 200)}`
      );
    }
    const json: unknown = await res.json();
    return parseExplorerMastersResponse(json);
  }
  throw new Error("Lichess explorer: retries exhausted");
}

export { buildMastersUrl, fetchOpeningExplorerMasters, getExplorerBaseUrl };
