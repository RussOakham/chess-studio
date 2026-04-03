# Data and persistence

## Overview

All application data for Chess Studio lives in **[Convex](https://www.convex.dev/)**: document tables, indexes, queries, mutations, and actions. There is no separate application database (no Postgres, ORM migrations, or SQL connection strings in this repo).

## What Convex stores

- **Games and moves** — `games`, `moves` tables; real-time subscriptions for live play.
- **Game reviews** — `game_reviews` (engine analysis output, optional AI summary fields).
- **Auth** — Better Auth via `@convex-dev/better-auth`: users, sessions, accounts, etc., in Convex.
- **Caches** — e.g. Lichess Opening Explorer payloads where implemented.

## Schema and changes

- **Source of truth:** `apps/web/convex/schema.ts`.
- **Local development:** `npx convex dev` from `apps/web` (or `pnpm --filter @repo/web convex:dev`) applies schema and function updates to your dev deployment.
- **Production:** `npx convex deploy` (or CI) for the target Convex deployment.

Follow Convex guidance for indexes, validators (`v.*`), and access control in public functions.

## Caching

Convex serves as the primary datastore; the app does not require Redis or a separate cache layer for core flows. If you add heavy read caching later, evaluate **Convex patterns first**, then optional edge or Redis products only if measured need arises.

## Related

- [`convex-auth-data.md`](./convex-auth-data.md) — auth and env alignment.
- [`architecture.md`](./architecture.md) — runtime diagram.
- `.cursor/rules/database-migrations.mdc` — Convex migration reminders for agents.
