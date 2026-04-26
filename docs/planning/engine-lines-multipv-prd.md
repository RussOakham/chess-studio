# Engine lines (MultiPV) — PRD and implementation plan

This document defines the **product requirements** and a **phased implementation plan** for showing **multiple engine principal variations** (“best N lines”) on the game review experience, and sets the foundation for **future AI-assisted position commentary** grounded in those lines.

**Related:** [Learning and feedback enhancements](./learning-and-feedback-enhancements.md) (hints and position review sections), [Feature status](../implementation/feature-status.md). The shipped **AI game summary** (full-game **Large Language Model (LLM)** narrative) is a separate feature in `apps/web/convex/ai_game_summary.ts` and the game review UI.

**Status:** Shipped in app (MultiPV analysis panel in review and optional live game toggle); Convex persistence for lines remains out of scope for v1.

---

## 1. Product requirements (PRD)

### 1.1 Context

Major chess sites (e.g. chess.com) expose **engine lines**: ranked continuations with evaluations, powered by **Stockfish** in the browser. That pattern matches standard **UCI MultiPV** behavior: ask the engine for the top N principal variations at a chosen depth.

chess-studio today uses **client-side Stockfish** (`useStockfish`, `packages/chess/src/engine.ts`) with **single-PV** analysis only (`go depth N`, resolve on `bestmove`). The **evaluation bar** and **one best move** per position are supported; a **list of top lines** is not.

### 1.2 Problem

- Players reviewing a game cannot see **alternative strong continuations** side by side (only implicit “best move” in annotations / tooltips where implemented).
- A future **“explain this position”** flow needs **structured engine output** (several PVs + scores), not only a scalar eval or one UCI move.

### 1.3 Goals

1. **G1 — Parity with familiar analysis UX:** On the **game review** surface, offer a clear **“Engine lines”** (or equivalent) panel showing **N principal variations** (default **N = 3**), each with **evaluation** and **continuation** (SAN preferred in UI; UCI acceptable internally).
2. **G2 — Engine truth:** Lines must come from **Stockfish MultiPV** in the same worker path as the rest of the app, so rankings stay **consistent** with existing analysis (not a separate heuristic).
3. **G3 — Performance:** Avoid freezing the UI; cap work per position (depth, N, cancellation on navigation).
4. **G4 — Future AI:** Define a **stable structured shape** (FEN + lines + scores) that can be sent to an LLM for **position-level** narration without inventing refutations.

### 1.4 Non-goals (this initiative)

- **NG1:** Replacing the existing **full-game AI summary** feature or its Convex contract.
- **NG2:** Server-side engine clusters or cloud analysis APIs (unless explicitly added later).
- **NG3:** Guaranteeing **identical** depth/latency to chess.com (their builds, devices, and paywalls differ).
- **NG4:** Persisting **every** line for **every** ply in Convex by default (too heavy); optional incremental storage may be a later phase.

### 1.5 User stories

| ID  | As a…                     | I want…                                                                             | So that…                                                                 |
| --- | ------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| US1 | Player on the review page | To see the **top 3 engine lines** for the **current board position**                | I can compare continuations and scores like on major chess sites         |
| US2 | Player                    | **Engine lines to update** when I **step through** the move list or scrub the board | The lines always match the position I’m viewing                          |
| US3 | Player on a slower device | Analysis to stay **responsive** (loading state, cancel in-flight work)              | The tab doesn’t feel stuck                                               |
| US4 | (Future) Player           | **Optional “Explain position”** using AI                                            | I get prose grounded in **provided** PVs and evals, not invented tactics |

### 1.6 Functional requirements

| ID  | Requirement                                                                                                                                                                                                                                              | Priority |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | **MultiPV engine API:** Extend the chess engine layer to run `setoption name MultiPV value N` (default N=3), `go depth D` (or `movetime` T as an alternative mode), and parse **multiple** `info` lines into structured `{ multipvIndex, score, pv[] }`. | Must     |
| F2  | **Single worker discipline:** Reuse the existing **one Stockfish worker** pattern; do not run overlapping searches without **abort/cancel** or a queue (document chosen strategy).                                                                       | Must     |
| F3  | **Review UI:** On `/game/[gameId]/review`, when the board reflects a position (replay or current), show a panel listing **up to N** lines with **eval** (cp or mate) and **continuation** (SAN from FEN).                                                | Must     |
| F4  | **Depth policy:** Use a **documented** default depth for lines (may differ from full-game analysis “strong” depth); allow lowering depth on low-end devices if measured necessary (optional follow-up).                                                  | Should   |
| F5  | **Empty / terminal positions:** No legal moves → show a clear empty state; mate/stalemate → no misleading PVs.                                                                                                                                           | Must     |
| F6  | **Accessibility:** Panel readable with keyboard navigation where controls already exist; sufficient contrast (existing design system).                                                                                                                   | Should   |

### 1.7 UX notes

- **Placement:** Sidebar or collapsible block near the **evaluation bar** / analysis controls on the review page (exact layout follows existing review layout).
- **Density:** Prefer **three compact rows** (rank, eval, first few SAN moves of PV) with expand/chevron for full PV if long.
- **Labels:** Copy should say “Engine lines” or “Top lines” — avoid implying **mathematically proven** best play; “at depth D” tooltip is optional but honest.

### 1.8 Success metrics (product)

- **SM1:** Feature usable on a **mid-range laptop** without sustained main-thread blocking (qualitative + optional Performance panel).
- **SM2:** User-facing **errors** rare (graceful fallback when engine not ready).
- **SM3:** (If instrumented later) engagement with review page session length or repeat visits — optional.

---

## 2. Technical approach

### 2.1 Stockfish “Lite” vs current WASM

- **MultiPV** is a **standard UCI option**; it does **not** require switching to a “Lite” build.
- **Stockfish 18 Lite** (as branded on some sites) is a **product/bundle** choice: often smaller binary, slightly different strength/speed tradeoffs.
- **Recommendation:** Implement MultiPV on the **current** `public/engine/stockfish.js` worker first. **Optionally** evaluate swapping the worker binary later for **load time / bundle size / version parity**, with profiling — not a blocker for this PRD.

### 2.2 UCI behavior (summary)

1. `setoption name MultiPV value 3`
2. `position fen <fen>`
3. `go depth <D>` (or `go movetime <ms>`)
4. Parse streaming `info` messages; collect **per multipv** the latest stable `score` and `pv` fields until `bestmove`.

**Edge cases:** Some builds emit multiple `info` lines; final PV per `multipv` index should be taken from the **last complete info** before `bestmove`, or per project convention (document in code).

### 2.3 Where code lives today (baseline)

| Area                                             | Role today                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `packages/chess/src/engine.ts`                   | `calculateBestMove`, `getPositionEvaluation` — **single PV**, depth-based `go` |
| `apps/web/lib/hooks/use-stockfish.ts`            | Worker lifecycle, `getBestMove`, `getEvaluation`, `isCalculating` guard        |
| `apps/web/lib/run-game-analysis.ts`              | Sequential per-move analysis for **persisted** review (not MultiPV)            |
| `apps/web/app/.../review/review-page-client.tsx` | Review UI, eval bar, AI summary block                                          |

New work adds **parse + API** in `packages/chess` and **hooks + UI** in `apps/web`.

---

## 3. Implementation plan

### Phase 0 — Spike (1–2 days)

**Objective:** Prove MultiPV parsing against the shipped worker.

- [ ] Add a **dev-only** or **unit-test-adjacent** harness that feeds sample FENs and asserts three PVs parse.
- [ ] Document **abort** semantics (`stop` / `ucinewgame`) if user changes position mid-search.
- [ ] **Exit criteria:** Stable structured output for 3 lines on 5–10 test positions (opening, tactical, endgame).

### Phase 1 — Engine module (`packages/chess`)

- [ ] Introduce types, e.g. `EngineLine { multipv: number; evaluation: PositionEvaluation; movesUci: string[] }` (refine names to match codebase).
- [ ] Implement `getTopEngineLines(fen, options)` where `options` includes `{ depth, multipv }` and uses existing `StockfishInstance`.
- [ ] Handle **mate/cp** scoring consistently with **White’s perspective** (align with `getPositionEvaluation` normalization).
- [ ] Optional: `ucinewgame` between searches if required by worker behavior.
- [ ] Export from `packages/chess` and add **unit tests** for parsing (mock UCI strings if feasible).

### Phase 2 — Hook integration (`apps/web`)

- [ ] Extend `useStockfish` (or add `useEngineLines`) with **`getEngineLines(fen, opts)`**, respecting **single-flight** / cancel:
  - Either reject concurrent calls or queue (match existing `isCalculating` pattern).
- [ ] On position change (move index / FEN), **cancel** in-flight search before starting a new one.
- [ ] Expose **loading** and **error** state for UI.

### Phase 3 — Review page UI

- [ ] New presentational component, e.g. `engine-lines-panel.tsx` (kebab-case per repo), showing N rows.
- [ ] Convert PV UCI to **SAN** using `chess.js` from the position FEN (reuse patterns from elsewhere in app).
- [ ] Wire to **current FEN** from review replay state (same source as board).
- [ ] **Empty states:** engine loading, no worker, analysis unavailable.
- [ ] Copy in `lib/copy` if the project centralizes strings for review.

### Phase 4 — Polish and guardrails

- [ ] **Depth default:** e.g. align with “club”/“strong” tier or one step below full game analysis — document in `engine.ts` or review-specific constant.
- [ ] **Mobile:** verify scroll and panel collapse; reduce N or depth if needed.
- [ ] **Lint / type-check / manual QA** on Chrome/Safari.

### Phase 5 — (Optional) Persistence

Only if product asks for “lines remembered per move” without recompute:

- [ ] Schema slice on `game_reviews` or child table (versioned JSON per move index).
- [ ] Size caps and migration story.

**Default recommendation:** **On-demand only** for v1 — no Convex persistence of MultiPV rows.

---

## 4. Future work — AI position review (not in v1 scope)

**Intent:** Use **structured** `{ fen, sideToMove, lines[] }` where each line includes **eval + PV (UCI or SAN)** as the **primary** grounding payload for an LLM (Vercel AI Gateway, same patterns as existing AI summary: server-side Convex action, Zod DTO, strict “do not invent a better move than provided” instructions).

**Suggested DTO sketch (illustrative):**

```text
fen: string
moveNumber?: number
lines: Array<{
  rank: number
  evaluation: { type: "cp" | "mate"; value: number }
  continuationSan: string[]
}>
userContext?: { lastMoveSan?: string }  // optional
```

**Triggers:** User clicks “Explain this position” on review board; **not** every ply by default (cost control).

**Dependencies:** Phase 1–3 of this plan (reliable MultiPV extraction).

---

## 5. Risks and mitigations

| Risk                             | Mitigation                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| MultiPV slower than single PV    | Lower default depth for lines; lazy-load panel; show spinner |
| Worker message volume            | Parse incrementally; debounce position changes               |
| SAN conversion errors on long PV | Truncate display; validate with chess.js                     |
| Concurrent searches              | Single-flight + cancel/`stop` before new `go`                |

---

## 6. Testing checklist

- [ ] Unit: UCI `info` parsing (multipv 1–3, cp and mate scores).
- [ ] Integration: review page stepping moves updates lines correctly.
- [ ] Edge: start position, sharp tactical position, endgame KRvK-style if applicable.
- [ ] Regression: existing `getBestMove` / game analysis pipeline still passes.

---

## 7. References

- UCI specification (MultiPV, `info` lines) — community docs / Stockfish wiki.
- [Browse AI Gateway models](https://vercel.com/ai-gateway/models) — model selection for future position narration.
- Internal: `packages/chess/src/engine.ts`, `apps/web/lib/hooks/use-stockfish.ts`, review route components.
