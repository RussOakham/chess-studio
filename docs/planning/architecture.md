# Project architecture

## Overview

**chess-studio** is a Turborepo monorepo: a **Next.js** app (`apps/web`) for the UI and auth routes, **Convex** for persistence, real-time subscriptions, and server functions, and **Better Auth** integrated with Convex. The chess **Stockfish** engine runs **in the browser** (Web Worker) for evaluation, hints, and opponent moves—not on a separate game API.

**Deployment:** The Next.js app runs on **[Vercel](https://vercel.com)**; **[Convex](https://www.convex.dev/)** runs on Convex Cloud (`npx convex deploy`). See [`vercel-deployment-plan.md`](./vercel-deployment-plan.md) and the index at [`deployment.md`](./deployment.md).

## Deployment (summary)

| Piece       | Where        | Document                                                   |
| ----------- | ------------ | ---------------------------------------------------------- |
| **Web**     | Vercel       | [`vercel-deployment-plan.md`](./vercel-deployment-plan.md) |
| **Backend** | Convex Cloud | Same + [`stack-and-data.md`](./stack-and-data.md)          |

## Monorepo structure (current)

```text
chess-studio/
├── apps/
│   └── web/                    # Next.js (App Router), Convex functions live under convex/
│       ├── app/                # Routes, layouts, Server Components
│       ├── convex/             # Queries, mutations, schema, HTTP
│       └── lib/                # Client hooks, Stockfish, game analysis
├── packages/
│   ├── chess/                  # Shared chess logic
│   └── types/                  # Shared TypeScript types
└── docs/
```

There is **no** `apps/api` service in the repository; backend behavior is **Convex** plus Next.js **route handlers** (e.g. Better Auth under `app/api/auth`).

## Runtime architecture (current)

```text
┌─────────────────────────────────────────────────────────────┐
│  User (browser)                                              │
│  ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │ Next.js UI   │    │ Stockfish (npm package, worker)  │ │
│  │ (Vercel)     │    │ Eval, hints, engine moves          │ │
│  └──────┬───────┘    └───────────────────────────────────┘ │
└─────────┼────────────────────────────────────────────────────┘
          │ Convex client (WebSocket / HTTP)
          ▼
┌─────────────────────────────────────────────────────────────┐
│  Convex Cloud                                                │
│  Games, moves, reviews, auth (Better Auth component),       │
│  Lichess explorer proxy/cache (actions), etc.               │
└─────────────────────────────────────────────────────────────┘
          │
          ▼ (outbound HTTP where applicable)
┌─────────────────────────────────────────────────────────────┐
│  External: Lichess Opening Explorer API, OAuth providers     │
└─────────────────────────────────────────────────────────────┘
```

## Frontend (Next.js App Router)

High-level route layout:

```text
apps/web/app/
├── (auth)/                 # login, register
├── (main)/                 # home, games list, game play, review
│   ├── game/[gameId]/      # Live game + review subroutes
│   └── ...
├── api/auth/[...all]/      # Better Auth handler
└── ...
```

Key UI concepts: chessboard, move list, evaluation bar, game review with move-quality annotations, replay controls.

## Data and backend (Convex)

- **Games and moves** — Stored and queried via Convex; real-time updates for active games.
- **Reviews** — Analysis results (summary, evaluations, key moments, move annotations) saved after **client-side** Stockfish runs over completed games (`run-game-analysis.ts`), then persisted through Convex.
- **Auth** — Better Auth with Convex; see [`stack-and-data.md`](./stack-and-data.md).

There is **no** separate REST API document for game CRUD in production; clients use **Convex generated APIs** (`useQuery`, `useMutation`, etc.).

## Stockfish and analysis

- **In-browser:** The `stockfish` package drives evaluation, hints (`use-hint.ts`), and engine moves on the client.
- **Game review:** Full-game analysis walks the move list, calls into Stockfish per position, classifies moves (blunder / mistake / inaccuracy / book / best), and may use **Lichess Opening Explorer** data (via Convex) for opening names and book lines—not for generating `keyMoments` strings (those come from engine classification).

## Integration points

- **Lichess** — Opening explorer (masters) for book metadata and explorer-backed UI; implemented with caching in Convex (`lichess_explorer.ts`, related libs under `apps/web/lib/lichess/`).
- **OAuth** — GitHub (and any others configured) via Better Auth.
- **AI summaries** — Optional **LLM-generated post-game narrative** via Convex action `ai_game_summary` (`apps/web/convex/ai_game_summary.ts`), using **Vercel AI Gateway** and the AI SDK (`apps/web/lib/ai/`). Requires `AI_GATEWAY_API_KEY`; rule-based engine analysis remains authoritative. Broader AI-assisted commentary (MultiPV lines, position explain) is roadmap work — see [`learning-and-feedback-enhancements.md`](./learning-and-feedback-enhancements.md) and [`engine-lines-multipv-prd.md`](./engine-lines-multipv-prd.md).

## Security considerations

- Authentication via Better Auth; Convex functions use authenticated helpers where required.
- Validate user input in Convex (arguments and access rules per function).
- Rate-limit or cache external API calls (e.g. Lichess) to respect third-party limits.

## Performance considerations

- Client Stockfish: cap depth for UI responsiveness; sequential analysis for full-game review to avoid overloading the worker.
- Convex: indexes and pagination for large lists (follow Convex best practices in `convex/`).
