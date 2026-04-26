import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getBookOpeningLine, isBookContinuation } from "./book-heuristic";
import { fenForExplorerCacheKey } from "./fen-for-explorer-cache";
import { parseExplorerMastersResponse } from "./parse-explorer-response";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  __dirname,
  "__fixtures__",
  "masters-example.json"
);

describe("fenForExplorerCacheKey", () => {
  it("drops halfmove and fullmove fields", () => {
    const keyWithoutPly = fenForExplorerCacheKey(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
    const keyWithDifferentPly = fenForExplorerCacheKey(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 5 3"
    );
    expect(keyWithoutPly).toBe(keyWithDifferentPly);
  });
});

describe("parseExplorerMastersResponse", () => {
  it("parses fixture JSON", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const parsed = parseExplorerMastersResponse(raw);
    expect(parsed.opening?.name).toBe("Slav Defense: Exchange Variation");
    expect(parsed.moves).toHaveLength(2);
    expect(parsed.moves[0]?.uci).toBe("c6d5");
  });
});

describe("isBookContinuation", () => {
  it("returns true for high-share move", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const parsed = parseExplorerMastersResponse(raw);
    // eslint-disable-next-line vitest/prefer-strict-boolean-matchers -- keep boolean matcher consistent in this file
    expect(isBookContinuation(parsed, "c6d5")).toBeTruthy();
  });

  it("returns false for unknown UCI", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const parsed = parseExplorerMastersResponse(raw);
    // eslint-disable-next-line vitest/prefer-strict-boolean-matchers -- keep boolean matcher consistent in this file
    expect(isBookContinuation(parsed, "h7h6")).toBeFalsy();
  });
});

describe("getBookOpeningLine", () => {
  it("prefers row opening when set", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const parsed = parseExplorerMastersResponse(raw);
    const line = getBookOpeningLine(parsed, "g8f6");
    expect(line?.eco).toBe("D06");
    expect(line?.name).toContain("Queen's Gambit");
  });

  it("falls back to position opening when row opening is null", () => {
    const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as unknown;
    const parsed = parseExplorerMastersResponse(raw);
    const line = getBookOpeningLine(parsed, "c6d5");
    expect(line?.eco).toBe("D10");
    expect(line?.name).toContain("Slav");
  });
});
