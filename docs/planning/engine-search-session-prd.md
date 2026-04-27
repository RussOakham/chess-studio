# Engine “search session” deep module — PRD

**Status:** Draft

This PRD proposes a refactor to consolidate the repeated “event-based worker protocol” logic used to talk to Stockfish (best move, evaluation, and MultiPV top lines) into a **deep module**: a small interface that hides a lot of complexity and is testable in isolation.

## Problem Statement

Today, our engine helpers repeat the same “search session” mechanics in multiple places:

- register `message` handler
- gate/ignore stale messages (prior searches)
- enforce timeouts
- cleanup handlers + timers
- normalize outputs

This repetition increases maintenance cost and makes it easier for edge cases (stale messages, cleanup, timeouts, cancellation) to diverge subtly across “best move”, “evaluation”, and “top lines”.

## Solution

Introduce a single deep module that encapsulates the Stockfish worker protocol as a **search session** abstraction.

The module should provide a stable, small surface area for three core operations:

- best move search
- position evaluation search
- MultiPV “top lines” search

Existing exported helpers should become thin wrappers over this module to preserve public API stability while eliminating duplicated orchestration.

## User Stories

1. As a maintainer, I want one canonical implementation of the Stockfish “search session” protocol, so that behavior is consistent across all engine features.
2. As a maintainer, I want search results to ignore stale messages from prior searches, so that we don’t surface incorrect best moves / PV lines.
3. As a maintainer, I want every search to have a single, predictable cleanup path, so that listeners and timers don’t leak.
4. As a maintainer, I want timeouts to behave consistently across search types, so that the UI can rely on predictable failure modes.
5. As a maintainer, I want evaluation normalization rules to remain consistent (white perspective), so that downstream components don’t have to special-case search type.
6. As a maintainer, I want MultiPV line ranking to be deterministic, so that missing/partial PV updates don’t produce confusing UI output.
7. As a maintainer, I want the deep module to be testable with synthetic message streams, so that we can validate tricky ordering and edge cases without a real worker.
8. As a maintainer, I want existing public engine helpers to remain stable (or be migrated with minimal churn), so that app code changes are mechanical and low risk.

## Implementation Decisions

- Create a “search session” deep module with a small interface that hides:
  - listener wiring
  - timeout management
  - stale-message gating (“ignore prior search output until this run has started”)
  - resolve/reject exactly-once behavior
  - cleanup (listener + timeout) in all exit paths
- Keep existing exported helpers as wrappers to avoid unnecessary public API churn.
- Ensure consistent normalization conventions:
  - evaluation values normalized to a single perspective (white)
  - MultiPV ranks returned in a predictable order with a clear rule for missing ranks
- Keep concurrency policy explicit:
  - the module should assume it’s operating on a single worker-like `postMessage` interface
  - callers decide whether to single-flight/queue; this refactor should not introduce new concurrent searches

## Testing Decisions

- A good test validates **external behavior**, not implementation details:
  - given a message stream, the module resolves/rejects with the right value
  - cleanup is performed (handler removed) and timeouts are cleared
  - stale messages are ignored until the session has started
- Add unit tests for the deep module using synthetic message streams representing:
  - normal “bestmove” success
  - “no legal move” cases
  - evaluation score parsing (cp/mate)
  - MultiPV info updates + bestmove completion
  - timeout behavior
  - out-of-order messages / stale prior-search messages
- Prior art:
  - existing Vitest tests around engine parsing and top lines behavior

## Out of Scope

- Changing UI behavior or adding new UI features.
- Changing difficulty/depth policy (strength tuning).
- Introducing server-side engine infrastructure.
- Broad refactors of app-side hooks beyond mechanical rewiring to the preserved wrapper APIs.

## Further Notes

- This PRD is intentionally refactor-focused: the goal is leverage and correctness, not net-new capability.
- Follow-up PRDs may build on this to deepen analysis orchestration, but this initiative should remain a single-seam change.
