# Docs index

## Start here

- **Architecture (canonical)**: `docs/planning/architecture.md`
- **Stack + data/auth (canonical)**: `docs/planning/stack-and-data.md`
- **Project direction / milestones (canonical)**: `docs/planning/project-plan.md`
- **Backlog (product, not status)**: `docs/planning/mvp-features.md`
- **Current shipped feature status (canonical)**: `docs/implementation/feature-status.md`

## What lives where

### `docs/planning/`

Forward-looking: roadmaps, PRDs, and “why we chose X” decisions.

- **Roadmap + milestones**: `project-plan.md`
- **Product backlog**: `mvp-features.md`
- **PRDs**: e.g. `engine-lines-multipv-prd.md`
- **Deploy & ops (canonical)**: `deploy-and-ops.md`
- **Architecture**: `architecture.md`
- **Stack + data/auth (canonical)**: `stack-and-data.md`
- **Testing strategy (canonical)**: `testing-strategy.md`

### `docs/implementation/`

“How it works today” and “what’s left” for engineering execution.

- **Shipped feature status + remaining work**: `feature-status.md`

### `docs/drafts/`

Drafts and scratchpads. These aren’t maintained to the same standard and may be out of date.

## Editing rules (to reduce drift)

- Prefer **one canonical doc per topic**; other docs should link rather than restate.
- If a doc claims something is shipped/planned, ensure the phrasing is explicit:
  - **Shipped**: implemented in codebase now
  - **Planned**: not implemented yet
  - **Out of scope / deferred**: intentionally not planned for near-term
