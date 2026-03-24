/**
 * Stable cache keys for Lichess Opening Explorer responses.
 * Uses the first four FEN fields (board, side, castling, en passant); omits
 * halfmove clock and fullmove number so equivalent opening positions share a key.
 *
 * @see https://github.com/lichess-org/api/blob/master/doc/specs/tags/openingexplorer/masters.yaml
 */
function fenForExplorerCacheKey(fen: string): string {
  const parts = fen.trim().split(/\s+/u);
  if (parts.length < 4) {
    return fen.trim().toLowerCase();
  }
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`.toLowerCase();
}

/** Matches Convex `lichessExplorer` action cache keys (masters DB). */
function explorerMastersCacheKey(fen: string): string {
  return `${fenForExplorerCacheKey(fen)}|masters`;
}

export { explorerMastersCacheKey, fenForExplorerCacheKey };
