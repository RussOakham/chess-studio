# Codebase review (refactor candidates + plan)

This document captures a lightweight review of the current codebase with an emphasis on **high-leverage refactors** (deep modules, clearer seams, fewer repeated orchestration patterns) and **test coverage improvements** aligned with `docs/planning/testing-strategy.md`.

Scope: code quality and architecture, not product roadmap.

## Executive summary

- **Core seams are in good shape**: `packages/chess` provides a clear “engine protocol + helpers” boundary; `apps/web/convex/lib/` (recursive) encapsulates auth/access control.
- **Main refactor opportunities**: consolidate “event-based worker protocol” patterns in `packages/chess/src/engine/` (recursive), tighten the analysis orchestration boundary (`runGameAnalysis` + `useGameAnalysis`), and reduce linter-workarounds by making interfaces a bit deeper.
- **Testing is early-stage**: there are a handful of Vitest tests (engine parsing, Lichess parsing, AI DTO/schema), but we’re still missing unit tests for the most business-critical pure logic (classification thresholds, summary/suggestion text, UCI parsing edge cases).

## Map of major modules (current)

- **Web app**: `apps/web` (Next.js App Router)
  - UI components under `apps/web/components/`
  - Client logic under `apps/web/lib/` (recursive)
  - Tests: `apps/web/**/{__tests__|*.test.ts}`
- **Backend**: `apps/web/convex/` (schema, queries, mutations, actions)
- **Shared chess logic**: `packages/chess/`
  - Engine protocol wrappers: `packages/chess/src/engine/` (recursive)

## Refactor candidates (prioritized)

### Now (highest leverage)

- **Deepen the Stockfish “search session” module**
  - **Why**: `calculateBestMove`, `getPositionEvaluation`, and `getTopEngineLines` repeat the same event-based worker protocol shape (listener + timeout + “ignore prior search” gating + stop/go sequencing).
  - **Symptom**: repeated `promise/avoid-new` and `unicorn/require-post-message-target-origin` suppressions around `postMessage` and promise boundaries.
  - **Proposed shape**: a single internal helper (or class) that models a “search session” and exposes:
    - `runBestMove(fen, depth)`
    - `runEvaluation(fen, depth)`
    - `runMultiPv(fen, depth, multipv)`
  - **Outcome**: smaller surface area, less duplication, fewer suppressions, easier tests for parsing + edge cases.
- **Make analysis orchestration a “deep module”**
  - **Current boundary**:
    - `runGameAnalysis` takes `getEvaluation`, `getBestMove`, `getExplorerBatch` and runs an imperative loop.
    - `useGameAnalysis` wires Convex + batching + parsing + saving.
  - **Why**: this is one of the business-critical paths (review output), and it already needs sequential constraints due to Stockfish statefulness.
  - **Proposed direction**:
    - keep `runGameAnalysis` pure (already close)
    - move all “wiring” concerns into a single module that exposes a narrow API like `analyzeCompletedGame({ game, moves, engine, explorer })`
  - **Outcome**: fewer edge-case bugs, easier integration tests (mock engine + mock explorer + assert persisted payload).

### Next (medium leverage)

- **Normalize “unknown → typed” parsing helpers**
  - Lichess parsing (`parseExplorerMastersResponse`) and Convex adapter responses (e.g. JWKS maintenance) both need robust unknown-shape handling.
  - **Opportunity**: a small shared `isRecord` / `readString` / `readNumber` helper that improves readability and consistency without adding abstraction bloat.
- **Reduce linter-driven structure changes**
  - The repo currently uses several targeted rule disables (await-in-loop, consistent-return in effects, worker postMessage origin).
  - **Goal**: keep suppressions rare and intention-revealing by pushing complexity behind deeper modules rather than “sprinkled comments”.

### Later (nice-to-have)

- **Clarify engine “depth/difficulty” semantics**
  - There’s a mix of “difficulty presets” and explicit depths across UI hooks and analysis paths.
  - **Goal**: a single mapping/contract for “what strength means” in each feature (live hints vs post-game analysis vs MultiPV lines).

## Testing opportunities (aligned with testing strategy)

### Unit tests (add first)

- `apps/web/lib/run-game-analysis/classification.ts`
  - thresholds and edge cases for `classifySuboptimalMove`, `evalToCp`, `normalizeUci`
- `apps/web/lib/run-game-analysis/summary-text.ts`
  - summary + suggestions generation for boundary counts (0, 1, many; high blunders; etc.)
- `packages/chess/src/engine/uci.ts`
  - `parseMultipvInfoLine` tricky inputs (missing pv, weird spacing, promotions, mate/cp switching)

### Integration tests (a few high-value)

- “Completed game → saved review payload”
  - mock engine adapter (evaluation + best move), mock explorer batch, run analysis, assert `api.reviews.save` args shape.

## Concrete “issue list” we can create from this

- **refactor(engine)**: consolidate Stockfish search session helpers
- **refactor(analysis)**: deepen analysis orchestration boundary
- **test(analysis)**: unit tests for classification + summary/suggestion generation
- **test(engine)**: broaden UCI parsing tests for MultiPV info lines

## Suggested review cadence

- Start with **1 refactor PR per seam**, each with:
  - a small, explicit “before/after” interface change
  - unit tests for the extracted module
  - `pnpm -s prep` as the gate
