/** Copy for MultiPV / engine lines panel (review + live game). */
export const engineLinesCopy = {
  title: "Analysis",
  stockfishShort: "Stockfish",
  headerMeta: (depth: number) => `depth=${String(depth)} | Stockfish`,
  loading: "Analyzing…",
  errorGeneric: "Could not load engine lines.",
  emptyPosition: "No lines for this position.",
  engineBusy: "Engine is thinking…",
  engineLoading: "Loading engine…",
  liveToggleLabel: "Show engine lines",
  liveToggleAria: "Show engine lines during play",
  lineTruncatedSuffix: "…",
} as const;
