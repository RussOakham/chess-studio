# Game review enhancements: cross-cutting QA and rollout

## Summary

**Request:** Coordinate validation, migrations, and release checks across the related game-review workstreams:

- Extended move classifications (`docs/temp/game-review-move-classifications.temp.md`)
- Evaluation timeline UI (`docs/temp/game-review-evaluation-timeline.temp.md`)
- Board overlays in review (`docs/temp/game-review-board-overlays.temp.md`)
- Lichess Opening Explorer (`docs/temp/lichess-opening-explorer-integration.temp.md`)

This doc is **not** a standalone feature—it is a **rollout and QA** checklist so shipping order and regression coverage stay explicit.

### Current status (rolling)

| Workstream                                                        | Status                                                                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move classifications (`game-review-move-classifications.temp.md`) | Done (inaccuracy + shared types; draft PR #18).                                                                                                                                                                     |
| Evaluation timeline                                               | **Done** — `EvaluationSparkline` (area, markers, playhead, seek); overview + mid-review; `review.evaluations` backfill when missing/mismatched (auto `runAnalysis`, capped retries); `EvaluationBar` in-bar scores. |
| Board overlays                                                    | Not started                                                                                                                                                                                                         |
| Lichess Opening Explorer                                          | Not started                                                                                                                                                                                                         |

---

## Feasibility review

**Verdict:** N/A (process). Depends on completion of the feature docs listed above.

---

## Recommended implementation order

1. ~~**Move classifications**~~ — **Done** (schema/types + inaccuracy; timeline/Lichess can build on the same `MoveAnnotation` model).
2. ~~**Evaluation timeline**~~ — **Done** (markers use palette aligned with move list; playhead + seek).
3. **Board overlays** — consumes `moveAnnotations` + best-move data; **next up**; can ship in parallel once review data is stable.
4. **Lichess integration** — adds `book` and opening names; may extend schema again—if Lichess lands last, plan nullable fields or additive enum values to avoid double migrations.

If Lichess must ship first, ensure `MoveAnnotationType` includes `book` before UI assumes it.

---

## Cross-cutting checklist

### Data & migrations

- [x] Existing `game_reviews` documents remain valid (backward compatible defaults for new fields). _(Move classifications: additive `inaccuracy` literal; old reviews unchanged.)_
- [x] Re-run analysis path for games **without** `evaluations` (or wrong length vs moves): `reviewNeedsEvaluationsRefresh` + auto `runAnalysis` in `review-page-client.tsx` (capped attempts per stale review to avoid infinite retries).

### UX consistency

- [x] Badge colors for annotation types match between move list and evaluation timeline markers. _(Shared `annotation-chart-styles` + move-history palette.)_
- [ ] Tooltips / screen reader text use the same vocabulary as summaries (`keyMoments`). _(Spot-check after each review UI slice.)_

### Performance

- [ ] Full-game analysis time acceptable (Stockfish sequential + optional Lichess calls batched/cached).
- [ ] No N+1 Lichess requests: cache hits verified in dev logs.

### Quality gates

- [x] `pnpm lint:fix`, `pnpm format:fix`, `pnpm type-check` (run before merge; CI should match).
- [x] `pnpm lint:md` when markdown under `docs/` changes.
- [ ] Convex reviewer + Vercel React best-practices for touched areas (`@.cursor/rules/convex-react-review.mdc`) before merge.

### Manual scenarios

- [ ] Short game (< 10 moves): graph renders; playhead moves.
- [ ] Long game (100+ moves): SVG performance OK.
- [ ] Opening: book badge appears when Lichess integration enabled and rules satisfied.
- [ ] Middlegame only: no false “book” labels if restricted to first N plies.

---

## Progress checklist

- [x] Order of execution agreed (classifications → timeline → board overlays → Lichess, or adjusted).
- [ ] Cross-cutting QA section above completed after feature work.
- [ ] Stakeholder demo notes (optional)
