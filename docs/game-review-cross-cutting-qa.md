# Game review enhancements: cross-cutting QA and rollout

## Summary

**Request:** Coordinate validation, migrations, and release checks across the related game-review workstreams:

- Extended move classifications (`docs/temp/game-review-move-classifications.temp.md`)
- Evaluation timeline UI (`docs/temp/game-review-evaluation-timeline.temp.md`)
- Board overlays in review — **spec lives in this doc** ([Board overlays](#board-overlays); replaces `docs/temp/game-review-board-overlays.temp.md`)
- Board move-quality **badges on squares** (Chess.com style — `docs/temp/game-review-board-move-quality-badges.temp.md`)
- Lichess Opening Explorer (`docs/temp/lichess-opening-explorer-integration.temp.md`)

This doc is **not** a standalone feature—it is a **rollout and QA** checklist so shipping order and regression coverage stay explicit.

### Current status (rolling)

| Workstream                                                                     | Status                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move classifications (`game-review-move-classifications.temp.md`)              | Done (inaccuracy + shared types; draft PR #18).                                                                                                                                                                                              |
| Evaluation timeline                                                            | **Done** — `EvaluationSparkline` (area, markers, playhead, seek); overview + mid-review; `review.evaluations` backfill when missing/mismatched (auto `runAnalysis`, capped retries); `EvaluationBar` in-bar scores.                          |
| Board overlays                                                                 | **Done (MVP)** — mid-review: engine line arrows always when data exists; `fenBefore` + arrows via `review-board-overlays.ts`; optional `bestMoveUci` on new analyses.                                                                        |
| On-board move quality badges (`game-review-board-move-quality-badges.temp.md`) | **Done** — mid-review: circular glyph on **to** square (`ReviewMoveQualityBadge` + `chess-square-layout`); parity with timeline via `shouldShowTimelineMarker`.                                                                              |
| Lichess Opening Explorer                                                       | **Done** — `book` on `MoveAnnotationType`; `lichessExplorer.batchExplorerMasters` + `lichess_explorer_cache`; batched prefetch in `run-game-analysis`; `openingNameLichess` on reviews; set `LICHESS_API_TOKEN` in Convex for upstream auth. |

---

## Board overlays

**Canonical spec:** This section (not a separate `docs/temp/` file). The former `docs/temp/game-review-board-overlays.temp.md` path is retired.

**Intent:** On the review board, visualize engine-backed hints (best-move + played-move arrows, light square highlights) using **`moveAnnotations`**, Convex **`moves`** (`fenBefore`, `moveUci`), and optional **`bestMoveUci`** from analysis.

### Implemented behavior (MVP)

- **Where:** Mid-review flow only (`?move=` URL, `ReviewMidReview`). Overview has no board.
- **When:** Suboptimal moves with a stored best line (`bestMoveSan` and/or `bestMoveUci` from analysis).
- **FEN rule:** Arrows are defined on the position **before** the played move. Whenever a move has a stored best line (`bestMoveSan` / `bestMoveUci`), the board `position` switches to `currentMove.fenBefore` so arrows match; if parsing fails, the board stays on normal replay `viewingFen` and an error line appears in the sidebar.
- **Arrows:** Played move (color by annotation: blunder / mistake / inaccuracy) then engine-best (green, same hue as live hints). **Square highlights** optional tint on those squares.
- **Data:** New reviews store **`bestMoveUci`** from analysis (`run-game-analysis.ts`) for reliable overlays; older reviews still use SAN parsing via `bestMoveSan`.
- **Failure:** If SAN/UCI cannot be resolved, an inline error is shown and the board stays on `viewingFen`.
- **Accessibility:** `role="group"` + `aria-label` on the board region describes “position before move” when the engine line is visible.

### Follow-ups

- Overview page board + same overlays (optional).
- Eval bar alignment when `position` is `fenBefore` vs replay index (currently eval bar still follows replay `viewingFen`).

---

## Feasibility review

**Verdict:** N/A (process). Depends on completion of the feature docs listed above.

---

## Recommended implementation order

1. ~~**Move classifications**~~ — **Done** (schema/types + inaccuracy; timeline/Lichess can build on the same `MoveAnnotation` model).
2. ~~**Evaluation timeline**~~ — **Done** (markers use palette aligned with move list; playhead + seek).
3. ~~**Board overlays**~~ — **Done (MVP)** — mid-review arrows (always when best line exists); `bestMoveUci` on new analyses.
4. ~~**Lichess integration**~~ — **Done** (`book` + `openingNameLichess`; explorer cache table; optional `LICHESS_API_TOKEN`).

---

## Cross-cutting checklist

### Data & migrations

- [x] Existing `game_reviews` documents remain valid (backward compatible defaults for new fields). _(Move classifications: additive `inaccuracy` literal; old reviews unchanged.)_
- [x] Additive optional `bestMoveUci` on embedded `moveAnnotations` (board overlays); old reviews without it still work via `bestMoveSan`.
- [x] Re-run analysis path for games **without** `evaluations` (or wrong length vs moves): `reviewNeedsEvaluationsRefresh` + auto `runAnalysis` in `review-page-client.tsx` (capped attempts per stale review to avoid infinite retries).

### UX consistency

- [x] Badge colors for annotation types match between move list and evaluation timeline markers. _(Shared `annotation-chart-styles` + move-history palette.)_
- [ ] Tooltips / screen reader text use the same vocabulary as summaries (`keyMoments`). _(Spot-check after each review UI slice.)_

### Performance

- [x] Full-game analysis time acceptable (Stockfish sequential + optional Lichess calls batched/cached). _(One batched `batchExplorerMasters` call before the move loop; 120ms spacing between upstream fetches inside the action.)_
- [x] No N+1 Lichess requests: cache hits verified in dev logs. _(Per-FEN cache key + 7-day TTL in `lichess_explorer_cache`.)_

### Quality gates

- [x] `pnpm lint:fix`, `pnpm format:fix`, `pnpm type-check` (run before merge; CI should match).
- [x] `pnpm lint:md` when markdown under `docs/` changes.
- [ ] Convex reviewer + Vercel React best-practices for touched areas (`@.cursor/rules/convex-react-review.mdc`) before merge.

### Manual scenarios

- [ ] Mid-review: suboptimal move with best line — board shows `fenBefore`, two arrows, no console errors.
- [ ] Short game (< 10 moves): graph renders; playhead moves.
- [ ] Long game (100+ moves): SVG performance OK.
- [ ] Opening: book badge appears when Lichess integration enabled and rules satisfied. _(Requires `LICHESS_API_TOKEN` in Convex for authenticated explorer access.)_
- [ ] Middlegame only: no false “book” labels if restricted to first N plies. _(Heuristic: first 20 plies; `OPENING_MAX_PLY` in `book-heuristic.ts`.)_

---

## Progress checklist

- [x] Order of execution agreed (classifications → timeline → board overlays → Lichess, or adjusted).
- [ ] Cross-cutting QA section above completed after feature work.
- [ ] Stakeholder demo notes (optional)
