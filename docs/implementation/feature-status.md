# Feature status (shipped + remaining work)

This is the canonical “what’s shipped” status for the core Chess Studio experience.

If you want roadmaps/PRDs (not status), start from `docs/README.md` → `docs/planning/`.

## Shipped

- **Auth**: login/register and sessions (Better Auth + Convex)
- **Play vs engine**: client Stockfish worker for engine moves + difficulty presets
- **Live guidance**: evaluation bar + “Get Hint”
- **Persistence**: games, moves, and reviews in Convex with real-time subscriptions
- **History & replay**: `/games` list + move replay + PGN copy
- **Post-game review**: engine analysis + move quality + key moments + suggestions
- **Optional AI summary**: when configured (`AI_GATEWAY_API_KEY` on Convex)
- **MultiPV / engine lines**: top lines panel (review + optional live toggle)

## Remaining / deferred

- **Offer draw**: deferred until PvP exists (PvE doesn’t need it)
- **`/games` pagination**: only if the list becomes large (current cap is fine for now)
- **Best-move suggestion display**: optional future UX (beyond hint + analysis)

## History

The original phased checklist and longer implementation notes are preserved in:

- `docs/drafts/feature-status-history.md`
