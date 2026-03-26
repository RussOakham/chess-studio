# Project architecture

## Overview

**chess-studio** is a Turborepo monorepo: a **Next.js** app (`apps/web`) for the UI and auth routes, **Convex** for persistence, real-time subscriptions, and server functions, and **Better Auth** integrated with Convex. The chess **Stockfish** engine runs **in the browser** (Web Worker) for evaluation, hints, and opponent moves—not on a separate game API.

**Deployment:** The **current plan** is to host the Next.js app on **[Vercel](https://vercel.com)** (see [`vercel-deployment-plan.md`](./vercel-deployment-plan.md)). **[Convex](https://www.convex.dev/)** stays on Convex Cloud (`npx convex deploy`). An **alternate** self-hosted stack (VPS, Docker, Dokploy) is documented for possible future use in [`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md); see the index at [`deployment.md`](./deployment.md).

**Historical note:** Older sections of this file described a separate **Express/Go API** and **Postgres**; the codebase today uses **Convex only** for game and auth data (no Neon/Drizzle in the live app path). Diagrams labeled **alternate** or **legacy** illustrate that earlier direction.

## Deployment strategies (summary)

| Strategy      | Where                               | Document                                                                       |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| **Primary**   | Next.js on Vercel; Convex Cloud     | [`vercel-deployment-plan.md`](./vercel-deployment-plan.md)                     |
| **Alternate** | Private VPS, Docker, Dokploy, Nginx | [`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md) |

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
│   ├── db/                     # Drizzle types/schema (legacy / tooling; not app DB)
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
- **Auth** — Better Auth with Convex; see [`convex-auth-data.md`](./convex-auth-data.md).

There is **no** separate REST API document for game CRUD in production; clients use **Convex generated APIs** (`useQuery`, `useMutation`, etc.).

## Stockfish and analysis

- **In-browser:** The `stockfish` package drives evaluation, hints (`use-hint.ts`), and engine moves on the client.
- **Game review:** Full-game analysis walks the move list, calls into Stockfish per position, classifies moves (blunder / mistake / inaccuracy / book / best), and may use **Lichess Opening Explorer** data (via Convex) for opening names and book lines—not for generating `keyMoments` strings (those come from engine classification).

## Integration points

- **Lichess** — Opening explorer (masters) for book metadata and explorer-backed UI; implemented with caching in Convex (`lichess_explorer.ts`, related libs under `apps/web/lib/lichess/`).
- **OAuth** — GitHub (and any others configured) via Better Auth.
- **Future AI** — Not wired in production at the time of this writing; see [`learning-and-feedback-enhancements.md`](./learning-and-feedback-enhancements.md) for product direction.

## Security considerations

- Authentication via Better Auth; Convex functions use authenticated helpers where required.
- Validate user input in Convex (arguments and access rules per function).
- Rate-limit or cache external API calls (e.g. Lichess) to respect third-party limits.

## Performance considerations

- Client Stockfish: cap depth for UI responsiveness; sequential analysis for full-game review to avoid overloading the worker.
- Convex: indexes and pagination for large lists (follow Convex best practices in `convex/`).

---

## Alternate deployment architecture (reference only)

The following reflects a **self-hosted** layout **not** in use as the primary plan. It matches the narrative in [`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md) (Nginx, multiple containers). A future migration might still keep **Convex Cloud** and only move the Next.js workload to a VPS.

```text
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│         (e.g. via Dokploy)              │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌────▼────┐  ┌───▼────┐
│  Web  │  │   API   │  │ (opt)  │
│(Next.js)│ │(legacy  │  │ extras │
│ Docker │  │ design) │  │        │
└────────┘  └─────────┘  └────────┘
```

---

## Legacy reference: earlier hybrid API + Postgres sketch

The block below is **retained for historical context** only. It does **not** describe the current chess-studio implementation.

### Earlier monorepo sketch (outdated)

```text
chess-game/                    # illustrative only
├── apps/
│   ├── web/
│   └── api/                   # not present in chess-studio today
├── packages/
└── docker/
```

### Earlier “hybrid” diagram (outdated)

```text
┌─────────────────┐
│   Next.js Web   │
│  Auth API       │
└────────┬────────┘
         │
    ┌────▼──────────────────┐
    │   Express/Go API      │  ← superseded by Convex
    └────┬──────────┬───────┘
         │          │
    ┌────▼───┐  ┌───▼────┐
    │Postgres│  │Stockfish│
    └────────┘  └────────┘
```

### Earlier data model sketch (SQL, outdated)

Convex schema replaces direct SQL tables for app data; the conceptual entities (users, games, moves, reviews) remain similar at a high level.

```sql
-- Illustrative only — actual storage is Convex documents
users (id, email, ...)
games (id, user_id, ...)
moves (id, game_id, ...)
game_reviews (id, game_id, summary, key_moments, ...)
```
