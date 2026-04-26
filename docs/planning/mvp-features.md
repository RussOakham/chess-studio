# MVP and roadmap — AI-empowered game analysis

## Overview

This document describes **product priorities** for Chess Studio. The focus is **analysis and understanding**: engine-backed **evaluations**, **best moves and lines**, **move quality**, and **optional AI-assisted narrative**—not parity with a full chess.com-style social platform.

**Implementation status:** See [`docs/implementation/game-implementation-plan.md`](../implementation/game-implementation-plan.md) for the phased engineering checklist. Bullets here are **backlog and direction**, not automatic shipped/not-shipped markers.

## North star

1. **Engine truth first** — Stockfish (client) owns evaluations, best moves, and classifications; Lichess Opening Explorer enriches book/opening metadata where used.
2. **LLM as narrator** — Language models **explain and organize** structured engine output (e.g. post-game summary); they must **not** invent refutations or contradict stored best moves.
3. **Convex as system of record** — Games, moves, reviews, and auth live in Convex with typed queries/mutations (no separate REST or tRPC game API).

## Phase 1 — Core analysis loop (must-have direction)

### Authentication & profile

- Registration, login, logout, sessions
- Basic profile (username, email; avatar optional)

### Play vs engine

- Interactive board (validation, special moves, status)
- Stockfish opponent with difficulty presets
- Live evaluation bar during play
- Engine **hints** (best move from Stockfish)

### Post-game analysis & review

- Full-game engine pass over the move list; persist to `game_reviews`
- Move annotations (blunder / mistake / inaccuracy / best / book / good), key moments, suggestions
- **Optional AI summary** — LLM narrative when `AI_GATEWAY_API_KEY` is set (Vercel AI Gateway + Convex action); rule-based fields remain authoritative

### Game history

- List past games; open a game; **replay** and review surfaces

### Near-term roadmap (same product theme)

- **MultiPV / top engine lines** on the review page — see [`engine-lines-multipv-prd.md`](./engine-lines-multipv-prd.md)
- Richer **position-level** or **line-level** AI commentary grounded in engine PVs (planning — [`learning-and-feedback-enhancements.md`](./learning-and-feedback-enhancements.md))

## Phase 2 — Deeper product (nice-to-have)

- Time controls and clocks
- User ratings
- Pre-moves, planned/draft move mode (faster play)
- Notifications
- Enhanced UX on the review page (depth controls, explain toggles) as analysis features land

## Phase 3 — Broader platform (future)

- Play vs human (matchmaking, live games)
- Puzzles, lessons, tournaments
- Social graph (friends, challenges) — only if product scope expands beyond analysis-first

### Advanced analysis (future)

- Deeper opening book / tablebase integration
- **Similarity search** or large-scale position retrieval would require **additional infrastructure** (not part of the current Convex-only data path); treat as research, not committed scope.

## Technical foundations (aligned with repo)

- **Real time:** Convex subscriptions for live games
- **Engine:** Client Stockfish worker; MultiPV extension per PRD
- **AI:** Vercel AI Gateway + AI SDK for summaries; optional future providers behind the same pattern
- **Types:** Convex-generated API types and strict TypeScript

## Success criteria (product)

- Players can finish a game vs engine and open a **review** with engine-backed insight
- **Best-move context** is visible where implemented (annotations, hints; MultiPV when shipped)
- Optional **AI summary** reads well and does not contradict engine labels when enabled
- App remains responsive on typical hardware (analysis depth and cancellation matter)

## Out of scope unless roadmap changes

- Full social/chess.com parity
- Native mobile apps (web-first)
- Server-side engine farm (client Stockfish is the default architecture)

## See also

- [`project-plan.md`](./project-plan.md) — milestones
- [`architecture.md`](./architecture.md) — runtime and data flow
- [`stack-and-data.md`](./stack-and-data.md) — stack and data/auth (canonical)
