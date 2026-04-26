# Type Safety Strategy

## Overview

This document describes the end-to-end type safety strategy for the chess game application.

**Current approach:** The app uses **Convex** for the game and move API. Convex generates TypeScript types from your schema and function definitions in `apps/web/convex/` into `convex/_generated/` (API types and data model). The frontend imports `api` from `@/convex/_generated/api` and uses `useQuery` / `useMutation` / `useAction` with full inference — there is no separate REST or tRPC layer for games. See [`stack-and-data.md`](./stack-and-data.md) and `@.cursor/rules/convex.mdc`.

## Type flow (Convex)

```text
apps/web/convex/schema.ts + games.ts, reviews.ts, lichess_explorer.ts, …
  ↓
convex/_generated/api.d.ts, dataModel.d.ts (Convex codegen)
  ↓
useQuery(api.games.getById, { gameId }), useMutation(api.games.makeMove), …
  ↓
Args, return types, and `Doc<"games">` inferred in the app
```

**Usage in components:**

```typescript
// apps/web/components/game/game-page-client.tsx
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

const game = useQuery(api.games.getById, { gameId }); // Doc<"games"> | undefined
const makeMove = useMutation(api.games.makeMove); // (args) => Promise<...>
// game.fen, game.status, makeMove({ gameId, from, to, promotion }) all typed
```

## Why Convex fits this stack

- **Full-stack TypeScript:** Types flow from Convex functions to React hooks.
- **Generated client types:** `convex/_generated` stays in sync with schema and exports.
- **Real-time:** Subscriptions keep UI in sync without polling.
- **Single backend:** Schema, queries, mutations, actions, and auth (Better Auth JWT) in one place.

## Best practices

1. **Prefer inference:** Let Convex and TypeScript infer types; avoid duplicating shapes the schema already defines.
2. **Validate at boundaries:** Use Convex `args` validators (`v.*`) and `returns` where appropriate; add Zod or shared types at integration boundaries when needed.
3. **Single source of truth:** Table shapes live in `schema.ts`; avoid parallel hand-written DTO types unless you have a clear reason.
4. **Refactor safely:** Renaming Convex functions or fields surfaces in generated types and call sites.

## Historical note

Earlier experiments with alternate API layers are retired. **Production game and move traffic is Convex-only** (typed queries, mutations, and actions).

## Resources

- [Convex TypeScript](https://docs.convex.dev/understanding/best-practices/typescript)
- [Zod](https://zod.dev/) — optional runtime validation outside Convex validators
