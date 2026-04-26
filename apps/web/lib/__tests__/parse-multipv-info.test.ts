import { parseMultipvInfoLine } from "@repo/chess";
import { describe, expect, it } from "vitest";

describe("parseMultipvInfoLine", () => {
  it("parses cp score and pv moves", () => {
    const line =
      "info depth 12 seldepth 18 multipv 1 score cp 34 nodes 12345 pv e2e4 e7e5 g1f3";
    const parsed = parseMultipvInfoLine(line);
    expect(parsed).not.toBeNull();
    expect(parsed?.multipv).toBe(1);
    expect(parsed?.score).toStrictEqual({ type: "cp", raw: 34 });
    expect(parsed?.movesUci).toStrictEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("parses mate score", () => {
    const line = "info depth 20 multipv 2 score mate 3 pv h7h8q g8g7 h8h7";
    const parsed = parseMultipvInfoLine(line);
    expect(parsed?.score).toStrictEqual({ type: "mate", raw: 3 });
    expect(parsed?.multipv).toBe(2);
  });

  it("returns null without multipv", () => {
    expect(parseMultipvInfoLine("info depth 5 score cp 10")).toBeNull();
  });

  it("returns null without score", () => {
    expect(parseMultipvInfoLine("info depth 5 multipv 1 nodes 100")).toBeNull();
  });
});
