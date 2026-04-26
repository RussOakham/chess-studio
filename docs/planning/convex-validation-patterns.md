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

Shared rules for game id **strings** from URLs, search params, or props live in `apps/web/lib/validation/game-id.ts`:

- **`gameIdParamSchema`** — Zod schema (URL-safe segment before Convex validates the id).
- **`parseGameIdParam`** / **`toGameId`** (re-exported from `@/lib/convex-id`) — parse and narrow to `Id<"games">`; throws on failure.
- **`isPlausibleGameId`** — boolean guard without throwing.

Parse errors use **`zod-validation-error`** (`fromZodError`) so messages stay readable. Convex still enforces real ids and ownership when you call queries and mutations.

## `v` vs Zod

- **Queries and mutations:** keep using **`v.*`** for `args` unless you adopt Zod builders from the **`convex-helpers`** package ([npm](https://www.npmjs.com/package/convex-helpers), [GitHub](https://github.com/get-convex/convex-helpers)): [`zCustomQuery`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L105), [`zCustomMutation`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L187), and helpers [`zodToConvex`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L427) / [`zid`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L311) in **`convex-helpers/server/zod4`**. See the package README [Zod Validation](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md#zod-validation) section and Convex Stack [TypeScript, Zod, and validating function arguments](https://stack.convex.dev/typescript-zod-function-validation). Compose with **`customQuery`** / **`customMutation`** and the same auth `input` pattern as `authed_functions`.
- **Shared string shapes and client parsing:** use **Zod** in `lib/validation/` (and re-export from `lib/convex-id.ts` if you want a stable import path).
- **Actions:** use **`authedAction`** with **`v` args**. [`zCustomAction`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L269) (`convex-helpers/server/zod4`) can fail Convex module analysis for **`"use node"`** entrypoints in some setups; re-check with **`npx convex codegen`** before relying on Zod `args` for Node actions.

## Related: `convex-helpers/server/zod4`

The published module path is **`convex-helpers/server/zod4`** (source: [`zod4.ts`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts)). It exposes [`zCustomQuery`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L105), [`zCustomMutation`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L187), [`zCustomAction`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L269), plus [`zodToConvex`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L427) and [`zid`](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/server/zod4.ts#L311). For narrative and examples, use the [Zod Validation](https://github.com/get-convex/convex-helpers/blob/main/packages/convex-helpers/README.md#zod-validation) section of the package README and [TypeScript, Zod, and validating function arguments](https://stack.convex.dev/typescript-zod-function-validation) on Convex Stack. Run **`npx convex codegen`** to confirm the bundle analyzes cleanly.

## Related docs

- [Stack, data, auth, and AI env](./stack-and-data.md) — canonical reference.
