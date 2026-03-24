/**
 * Subset of Lichess Opening Explorer (masters) JSON used by chess-studio.
 * @see https://github.com/lichess-org/api/blob/master/doc/specs/schemas/OpeningExplorerMasters.yaml
 */

interface ExplorerOpening {
  eco: string;
  name: string;
}

interface ExplorerMastersMove {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  opening?: ExplorerOpening | null;
}

interface ExplorerMastersResponse {
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMastersMove[];
  opening?: ExplorerOpening | null;
}

export type { ExplorerMastersMove, ExplorerMastersResponse, ExplorerOpening };
