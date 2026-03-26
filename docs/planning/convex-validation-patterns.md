# Convex validation and access patterns

How this repo structures authentication, game ownership, and string/id validation for Convex and the Next.js client.

## Custom function wrappers (`convex-helpers`)

Use **`authedQuery`**, **`authedMutation`**, **`authedAction`**, **`ownedGameQuery`**, and **`ownedGameMutation`** from `apps/web/convex/lib/authed_functions.ts` instead of repeating `getUserIdentity` and ownership checks in every handler.

| Builder                                | When to use                               | What the handler gets                          |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `authedQuery` / `authedMutation`       | Caller must be signed in                  | `ctx.userId` (Better Auth JWT subject)         |
| `authedAction`                         | Signed-in action; Convex `v` args         | `ctx.userId`                                   |
| `ownedGameQuery` / `ownedGameMutation` | Caller must own the game in `args.gameId` | `ctx.game` (loaded document) and `args.gameId` |

Convex `args` still use **`v` validators** from `convex/values` for query/mutation builders (for example `gameId: v.id("games")` on owned-game builders). The `input` hook runs **`requireOwnedGame`** before your handler.

For **actions**, use **`authedAction`** with **`v` args** (see `apps/web/convex/lichess_explorer.ts`). Prefer validating richer shapes in the handler (or shared helpers) when `v` is enough at the boundary.

## Low-level access helpers

`apps/web/convex/lib/game_access.ts` exports **`getAuthedUserId`** and **`requireOwnedGame`** for use inside wrappers or rare cases where a custom builder does not fit. Prefer the authed/owned builders for new public functions.

## Convex filenames

Under `convex/`, use **underscores** in file names (for example `game_access.ts`, `authed_functions.ts`). Hyphens in path segments are invalid for Convex deployment.

## Client and URL: game ids (Zod)

Shared rules for game id **strings** from URLs, search params, or props live in **`apps/web/lib/validation/game-id.ts`**:

- **`gameIdParamSchema`** — Zod schema (URL-safe segment before Convex validates the id).
- **`parseGameIdParam`** / **`toGameId`** (re-exported from `@/lib/convex-id`) — parse and narrow to `Id<"games">`; throws on failure.
- **`isPlausibleGameId`** — boolean guard without throwing.

Parse errors use **`zod-validation-error`** (`fromZodError`) so messages stay readable. Convex still enforces real ids and ownership when you call queries and mutations.

## `v` vs Zod

- **Queries and mutations:** keep using **`v.*`** for `args` unless you adopt **`zCustomQuery` / `zCustomMutation`** from **`convex-helpers/server/zod4`** for Zod-defined server args. Compose them with **`customQuery` / `customMutation`** and the same auth `input` pattern as `authed_functions` (see `convex-helpers` docs).
- **Shared string shapes and client parsing:** use **Zod** in `lib/validation/` (and re-export from `lib/convex-id.ts` if you want a stable import path).
- **Actions:** use **`authedAction`** with **`v` args**. **`zCustomAction`** (`zod4`) can fail Convex module analysis for **`"use node"`** entrypoints in some setups; re-check with `npx convex codegen` before relying on Zod `args` for Node actions.

## Related: `convex-helpers/server/zod4`

For **Zod-defined Convex function arguments** on the server, **`convex-helpers/server/zod4`** exposes **`zCustomQuery`**, **`zCustomMutation`**, and **`zCustomAction`**, plus **`zodToConvex`** / **`zid`** helpers. Use them when you need Zod refinements beyond what `v` expresses, and run **`npx convex codegen`** to confirm the bundle analyzes cleanly.

## Related docs

- [Convex, auth, and data](./convex-auth-data.md) — stack and file map.
