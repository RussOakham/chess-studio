import type { StockfishInstance } from "@repo/chess";
import { getTopEngineLines } from "@repo/chess";

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

describe("getTopEngineLines (mock Stockfish)", () => {
  it("resolves three lines on bestmove", async () => {
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const script = [
      "info depth 10 multipv 1 score cp 20 pv e2e4 e7e5",
      "info depth 10 multipv 2 score cp 15 pv d2d4 d7d5",
      "info depth 10 multipv 3 score cp 10 pv g1f3 d7d5",
      "bestmove e2e4 ponder e7e5",
    ];
    const sf = createMockStockfish(script);
    const lines = await getTopEngineLines(fen, sf, { depth: 10, multipv: 3 });
    expect(lines).toHaveLength(3);
    expect(lines[0]?.movesUci[0]).toBe("e2e4");
    expect(lines[1]?.multipv).toBe(2);
  });

  it("resolves empty array on bestmove none", async () => {
    const sf = createMockStockfish(["bestmove (none)"]);
    const lines = await getTopEngineLines("8/8/8/8/8/8/8/k6K w - - 0 1", sf, {
      depth: 5,
      multipv: 3,
    });
    expect(lines).toStrictEqual([]);
  });
});
