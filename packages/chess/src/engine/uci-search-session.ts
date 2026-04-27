import type {
  EngineLine,
  GetTopEngineLinesOptions,
  PositionEvaluation,
} from "./engine-types";
import {
  isUciBestmoveNoMove,
  normalizeRawScoreToWhitePerspective,
  parseMultipvInfoLine,
} from "./uci";
import type { UciTransport } from "./uci-transport";

type UciSearchRequest =
  | { kind: "bestMove"; fen: string; depth: number; timeoutMs?: number }
  | { kind: "evaluation"; fen: string; depth: number; timeoutMs?: number }
  | {
      kind: "multiPv";
      fen: string;
      options: GetTopEngineLinesOptions;
      timeoutMs?: number;
    };

type UciSearchResult =
  | { kind: "bestMove"; bestMoveUci: string }
  | { kind: "evaluation"; evaluation: PositionEvaluation }
  | { kind: "multiPv"; lines: EngineLine[] };

interface UciSearchSession {
  run: (req: UciSearchRequest) => Promise<UciSearchResult>;
  dispose: () => void;
}

function getDefaultTimeoutMs(kind: UciSearchRequest["kind"]): number {
  if (kind === "bestMove") {
    return 30_000;
  }
  if (kind === "evaluation") {
    return 10_000;
  }
  return 90_000;
}

function getTimeoutErrorMessage(kind: UciSearchRequest["kind"]): string {
  if (kind === "multiPv") {
    return "MultiPV engine lines timeout";
  }
  if (kind === "evaluation") {
    return "Evaluation timeout";
  }
  return "Engine calculation timeout";
}

function createUciSearchSession(transport: UciTransport): UciSearchSession {
  let unsubscribe: (() => void) | null = null;

  const stopListening = () => {
    if (unsubscribe !== null) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const dispose = () => {
    stopListening();
    transport.send("stop");
  };

  const run = async (req: UciSearchRequest): Promise<UciSearchResult> => {
    stopListening();

    // Shared protocol: stop → (maybe setoption MultiPV) → position → go depth
    transport.send("stop");

    const isBlackToMove = req.fen.split(" ")[1] === "b";

    // eslint-disable-next-line promise/avoid-new -- event-based worker protocol needs a promise boundary
    return new Promise((resolve, reject) => {
      let settled = false;
      let accept = false;

      const timeoutMs = req.timeoutMs ?? getDefaultTimeoutMs(req.kind);

      const settleOnce = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        stopListening();
        clearTimeout(timeoutId);
        fn();
      };

      let evaluation: PositionEvaluation | null = null;
      const multipvState = new Map<
        number,
        { evaluation: PositionEvaluation; movesUci: string[] }
      >();

      const onLine = (message: string) => {
        if (!accept) {
          return;
        }

        if (req.kind === "evaluation") {
          if (message.includes("score")) {
            const mateMatch = /score mate (-?\d+)/.exec(message);
            const cpMatch = /score cp (-?\d+)/.exec(message);
            if (mateMatch) {
              const raw = parseInt(mateMatch[1] ?? "0", 10);
              evaluation = {
                type: "mate",
                value: isBlackToMove ? -raw : raw,
              };
            } else if (cpMatch) {
              const raw = parseInt(cpMatch[1] ?? "0", 10);
              evaluation = {
                type: "cp",
                value: isBlackToMove ? -raw : raw,
              };
            }
          }
        }

        if (req.kind === "multiPv") {
          if (message.startsWith("info ") && message.includes("multipv")) {
            const parsed = parseMultipvInfoLine(message);
            if (parsed !== null) {
              multipvState.set(parsed.multipv, {
                evaluation: normalizeRawScoreToWhitePerspective(
                  parsed.score,
                  isBlackToMove
                ),
                movesUci: parsed.movesUci,
              });
            }
          }
        }

        if (message.startsWith("bestmove")) {
          const tokens = message.trim().split(/\s+/);
          const [, bestMoveToken] = tokens;

          if (req.kind === "bestMove") {
            if (isUciBestmoveNoMove(bestMoveToken)) {
              settleOnce(() => reject(new Error("No legal moves available")));
              return;
            }
            const bestMoveUci = bestMoveToken ?? "";
            settleOnce(() => resolve({ kind: "bestMove", bestMoveUci }));
            return;
          }

          if (req.kind === "evaluation") {
            const ev = evaluation;
            if (ev === null) {
              settleOnce(() => reject(new Error("Could not get evaluation")));
              return;
            }
            settleOnce(() => resolve({ kind: "evaluation", evaluation: ev }));
            return;
          }

          // MultiPv
          const { multipv } = req.options;
          const maxLines = Math.min(500, Math.max(1, multipv ?? 3));

          if (isUciBestmoveNoMove(bestMoveToken)) {
            settleOnce(() => resolve({ kind: "multiPv", lines: [] }));
            return;
          }

          const lines: EngineLine[] = [];
          for (let rank = 1; rank <= maxLines; rank += 1) {
            const row = multipvState.get(rank);
            if (row !== undefined) {
              lines.push({
                multipv: rank,
                evaluation: row.evaluation,
                movesUci: row.movesUci,
              });
            }
          }
          settleOnce(() => resolve({ kind: "multiPv", lines }));
        }
      };

      const timeoutId = setTimeout(() => {
        settleOnce(() => {
          reject(new Error(getTimeoutErrorMessage(req.kind)));
        });
      }, timeoutMs);

      unsubscribe = transport.onLine(onLine);

      if (req.kind === "multiPv") {
        const { multipv } = req.options;
        const cappedMultipv = Math.min(500, Math.max(1, multipv ?? 3));
        transport.send(`setoption name MultiPV value ${String(cappedMultipv)}`);
      }

      transport.send(`position fen ${req.fen}`);
      accept = true;

      if (req.kind === "bestMove") {
        transport.send(`go depth ${String(req.depth)}`);
      } else if (req.kind === "evaluation") {
        transport.send(`go depth ${String(req.depth)}`);
      } else {
        transport.send(`go depth ${String(req.options.depth)}`);
      }
    });
  };

  return { run, dispose };
}

export { createUciSearchSession };
export type { UciSearchRequest, UciSearchResult, UciSearchSession };
