import type { StockfishInstance } from "@repo/chess";
import {
  calculateBestMove,
  getPositionEvaluation,
  getTopEngineLines,
} from "@repo/chess";
import { describe, expect, it } from "vitest";

function createMockStockfish(script: string[]): StockfishInstance {
  const queue = [...script];
  const listeners: ((event: MessageEvent<string>) => void)[] = [];
  return {
    postMessage(cmd: string) {
      if (cmd.startsWith("go ")) {
        for (const line of queue) {
          const event = new MessageEvent("message", { data: line });
          for (const listener of listeners) {
            listener(event);
          }
        }
      }
    },
    addEventListener(
      _type: "message",
      handler: (event: MessageEvent<string>) => void
    ) {
      listeners.push(handler);
    },
    removeEventListener(
      _type: "message",
      handler: (event: MessageEvent<string>) => void
    ) {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    },
    terminate() {},
  };
}

describe("uci search session (engine wrappers)", () => {
  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  it("calculateBestMove resolves on bestmove", async () => {
    const sf = createMockStockfish(["bestmove e2e4 ponder e7e5"]);
    await expect(calculateBestMove(startFen, 5, sf)).resolves.toBe("e2e4");
  });

  it("getPositionEvaluation resolves to normalized cp", async () => {
    const sf = createMockStockfish([
      "info depth 5 score cp 34 nodes 10 pv e2e4",
      "bestmove e2e4",
    ]);
    await expect(getPositionEvaluation(startFen, sf)).resolves.toStrictEqual({
      type: "cp",
      value: 34,
    });
  });

  it("getTopEngineLines collects multipv lines and resolves on bestmove", async () => {
    const sf = createMockStockfish([
      "info depth 10 multipv 1 score cp 20 pv e2e4 e7e5",
      "info depth 10 multipv 2 score cp 15 pv d2d4 d7d5",
      "bestmove e2e4 ponder e7e5",
    ]);
    const lines = await getTopEngineLines(startFen, sf, {
      depth: 10,
      multipv: 2,
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]?.multipv).toBe(1);
    expect(lines[1]?.multipv).toBe(2);
  });
});
