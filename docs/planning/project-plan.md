# Project Plan

## Overview

Planning, milestones, and roadmap for Chess Studio.

## Project goals

- Deliver **engine-backed, AI-augmented chess analysis**: clear evals, best lines and positions, move quality, and (where configured) **LLM narratives** grounded in engine output—not a full chess.com-style social product.
- Ship a **reliable play-vs-engine** loop with **Convex** persistence and **client Stockfish** for analysis during and after games.
- Keep the UI fast and honest: **engine truth first**, models as narrators and organizers.

## Features

### MVP and near-term priorities

See [`mvp-features.md`](./mvp-features.md) for the full backlog and phasing.

**In scope for the product direction:**

- **Authentication** — registration, login, sessions (Better Auth + Convex).
- **Play vs engine** — Stockfish opponent, difficulty presets, live eval bar.
- **Analysis & review** — post-game engine pass, move annotations, key moments, optional **AI summary** (Vercel AI Gateway) when enabled.
- **Hints** — engine best-move hints during play.
- **History & replay** — list games, open review, step through moves.
- **Roadmap** — MultiPV / **top engine lines** on review ([`engine-lines-multipv-prd.md`](./engine-lines-multipv-prd.md)), richer position commentary, deeper AI assist — see [`learning-and-feedback-enhancements.md`](./learning-and-feedback-enhancements.md).

## Milestones

- [x] Project setup and planning
- [x] Tech stack selection (Next.js, Convex, Better Auth, client Stockfish)
- [x] Architecture aligned with implementation ([`architecture.md`](./architecture.md))
- [x] Core game flow vs engine ([`game-implementation-plan.md`](../implementation/game-implementation-plan.md))
- [x] Engine integration (client Stockfish; evals, hints, post-game analysis)
- [x] Optional **AI game summary** (Convex action + Vercel AI Gateway when configured)
- [ ] **MultiPV / engine lines** on review (planned — see PRD above)
- [ ] Testing and refinement (ongoing)

## Notes

Add decisions, requirements, and tradeoffs here as the analysis and AI surfaces grow.
