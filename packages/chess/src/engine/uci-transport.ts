import type { StockfishInstance } from "./engine-types";

/* eslint-disable promise/prefer-await-to-callbacks -- event subscription API is callback-based by design */

interface UciTransport {
  send: (line: string) => void;
  onLine: (cb: (line: string) => void) => () => void;
}

function transportFromStockfishInstance(
  stockfish: StockfishInstance
): UciTransport {
  return {
    send: (line) => {
      // eslint-disable-next-line unicorn/require-post-message-target-origin -- Worker-like postMessage (not Window.postMessage)
      stockfish.postMessage(line);
    },
    onLine: (cb) => {
      const handler = (event: MessageEvent<string>) => {
        cb(event.data);
      };
      stockfish.addEventListener("message", handler);
      return () => stockfish.removeEventListener("message", handler);
    },
  };
}

export { transportFromStockfishInstance };
export type { UciTransport };
