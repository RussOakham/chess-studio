# Convex, auth, and data

Canonical reference for how the app uses Convex and authentication.

## Stack

- **Convex** is the database and backend for games, moves, reviews, Lichess explorer cache, and related tables. Real-time queries use Convex subscriptions.
- **Better Auth** is integrated via the Convex Better Auth component. User/session data lives in Convex; protected Convex functions use `ctx.auth.getUserIdentity()`.
- **Neon / Drizzle** in `packages/db` are not used for the live game/auth flow in this app.

## Environment

- **`NEXT_PUBLIC_CONVEX_URL`** — Convex deployment URL (Uniform Resource Locator); use the value from the dashboard or `npx convex dev`.
- Better Auth secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.) as required by your hosting setup.

## Code map

- `apps/web/convex/schema.ts` — table definitions.
- `apps/web/convex/auth.ts` — Better Auth integration with Convex.
- `apps/web/convex/games.ts`, `reviews.ts`, `lichess_explorer.ts`, `lichess_explorer_cache.ts` — domain Convex functions (queries, mutations, actions).

## Lichess Opening Explorer (optional)

Server-side batch fetch is exposed as **`api.lichess_explorer.batchExplorerMasters`** (Convex action). Set **`LICHESS_API_TOKEN`** on the Convex deployment for authenticated upstream Application Programming Interface (API) access. See `docs/game-review-cross-cutting-qa.md`.
