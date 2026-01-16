// Type declarations for stockfish package
// The stockfish package creates a Web Worker-like instance

declare module "stockfish" {
  interface StockfishWorker {
    postMessage: (message: string) => void;
    addEventListener: (
      type: "message",
      listener: (event: MessageEvent<string>) => void
    ) => void;
    removeEventListener: (
      type: "message",
      listener: (event: MessageEvent<string>) => void
    ) => void;
    terminate: () => void;
  }

  /**
   * Creates a new Stockfish engine instance (Web Worker-like)
   * @returns Stockfish worker instance
   */
  function stockfish(): StockfishWorker;

  export default stockfish;
}
