# Type Safety Strategy

## Overview

This document outlines the end-to-end type safety strategy for the chess game application.

**Current approach (game/move API):** We use **Convex** for type-safe queries and mutations. Types flow from Convex function definitions (`apps/web/convex/games.ts`) to the frontend via `convex/_generated`; no separate API layer or code generation. See `docs/temp/migrate-convex.temp.md` and `@.cursor/rules/convex.mdc`.

The sections below also describe **tRPC** as an alternative or historical context; the app no longer uses tRPC for games/moves.

## Type Safety Solution

### Convex ✅ **Selected** (game and move API)

**Why Convex?**

- **Full-stack TypeScript**: Types inferred from Convex queries/mutations to React hooks
- **No code generation**: Use `useQuery(api.games.getById, { gameId })` and `useMutation(api.games.makeMove)` with full inference
- **Real-time**: Subscriptions keep UI in sync without polling
- **Single backend**: Schema, queries, mutations, and auth (Better Auth JWT) in one place

### tRPC (alternative / historical)

**Why tRPC was considered?**

- **Full-stack TypeScript**: Types flow automatically from backend to frontend
- **No Code Generation**: Types are inferred at compile time
- **Excellent DX**: Full autocomplete and type checking in IDE
- **Runtime Safety**: Validates requests at runtime
- **Works with Next.js**: Excellent integration
- The app previously used tRPC for games; that layer has been removed in favour of Convex

## Architecture

### tRPC Setup

**Frontend (Next.js)**:

- tRPC React Query integration
- Type-safe API calls
- Automatic request/response typing

**Backend (Express.js or Go)**:

- tRPC router definition (Express.js)
- Procedure definitions with input/output types
- Type inference for all procedures
- **Note**: TypeScript 7.0 (Go-based compiler) works perfectly with tRPC
  - No compatibility issues
  - Just makes type checking faster
  - Same tRPC setup, better performance

### Type Flow

**With Express.js:**

```text
Backend (Express.js)
  ↓
tRPC Router (TypeScript)
  ↓
Type Inference
  ↓
Frontend (Next.js)
  ↓
tRPC Client (TypeScript)
  ↓
Full Type Safety ✅
```

**With TypeScript 7.0 (Go-based compiler):**

```text
TypeScript Source Code
  ↓
TypeScript 7.0 Compiler (Go-based, 10x faster)
  ↓
JavaScript Output (same as before)
  ↓
tRPC Router (Express.js)
  ↓
Type Inference
  ↓
Frontend (Next.js)
  ↓
tRPC Client (TypeScript)
  ↓
Full Type Safety ✅ (same as before, just faster)
```

## Implementation

### Backend tRPC Router

```typescript
// apps/api/src/routers/game.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const gameRouter = router({
  create: publicProcedure
    .input(
      z.object({
        difficulty: z.enum(["easy", "medium", "hard"]),
        color: z.enum(["white", "black"]).optional(),
      })
    )
    .output(
      z.object({
        gameId: z.string(),
        fen: z.string(),
        turn: z.enum(["white", "black"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Implementation
      return { gameId: "...", fen: "...", turn: "white" };
    }),

  makeMove: publicProcedure
    .input(
      z.object({
        gameId: z.string(),
        from: z.string(),
        to: z.string(),
        promotion: z.string().optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        fen: z.string(),
        move: z.object({
          from: z.string(),
          to: z.string(),
          san: z.string(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),

  getGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .output(
      z.object({
        id: z.string(),
        fen: z.string(),
        pgn: z.string(),
        moves: z.array(
          z.object({
            from: z.string(),
            to: z.string(),
            san: z.string(),
          })
        ),
      })
    )
    .query(async ({ input, ctx }) => {
      // Implementation
    }),
});
```

### Frontend tRPC Client

```typescript
// apps/web/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@repo/api/src/routers/_app";

export const trpc = createTRPCReact<AppRouter>();
```

### Usage in Components

```typescript
// apps/web/src/components/GameBoard.tsx
import { trpc } from "@/lib/trpc";

export function GameBoard({ gameId }: { gameId: string }) {
  const { data: game } = trpc.game.getGame.useQuery({ gameId });
  const makeMove = trpc.game.makeMove.useMutation();

  const handleMove = (from: string, to: string) => {
    makeMove.mutate({ gameId, from, to });
  };

  // Full type safety! ✅
  // game.fen is typed
  // makeMove.mutate expects correct input types
}
```

## Shared Types Package

### Structure

```text
packages/
└── types/
    ├── src/
    │   ├── game.ts          # Game-related types
    │   ├── user.ts          # User-related types
    │   ├── engine.ts        # Engine-related types
    │   └── index.ts         # Re-exports
    └── package.json
```

### Shared Types

```typescript
// packages/types/src/game.ts
export type GameStatus =
  | "in_progress"
  | "checkmate"
  | "stalemate"
  | "draw"
  | "resigned";

export type GameColor = "white" | "black";

export interface Game {
  id: string;
  userId: string;
  status: GameStatus;
  currentFen: string;
  pgn: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Move {
  from: string;
  to: string;
  san: string;
  uci: string;
  evaluation?: number;
}
```

## Type Safety Best Practices

### 1. Use Zod for Validation

- Define schemas with Zod
- Use for tRPC input/output validation
- Runtime type checking

### 2. Shared Types Package

- Common types in `packages/types`
- Imported by both frontend and backend
- Single source of truth

### 3. Type Inference

- Let TypeScript infer types where possible
- Use `typeof` and `ReturnType` utilities
- Avoid manual type duplication

### 4. API Contract

- tRPC ensures API contract matches types
- Breaking changes caught at compile time
- No runtime surprises

## Integration with Existing Stack

### Next.js Integration

- Use `@trpc/next` or `@trpc/react-query`
- Server-side rendering support
- React Query integration for caching

### Express.js Integration

- Use `@trpc/server` with Express adapter
- Middleware support
- Error handling

### Convex (current)

- Convex schema and function types flow to the frontend via `convex/_generated`
- Convex types → Frontend types (useQuery/useMutation). No Drizzle or tRPC; Neon and Drizzle are retired.

## Benefits

### Developer Experience

- **Autocomplete**: Full IDE support
- **Type Checking**: Catch errors at compile time
- **Refactoring**: Safe refactoring across stack
- **Documentation**: Types serve as documentation

### Runtime Safety

- **Validation**: Zod validates at runtime
- **Error Handling**: Type-safe error responses
- **No Surprises**: API contract enforced by types

### Maintainability

- **Single Source of Truth**: Types defined once
- **Breaking Changes**: Caught immediately
- **Documentation**: Types document API

## Migration Path

### Phase 1: Setup

1. Install tRPC dependencies
2. Set up tRPC router in backend
3. Set up tRPC client in frontend
4. Create shared types package

### Phase 2: Migrate APIs

1. Convert existing API routes to tRPC procedures
2. Update frontend to use tRPC client
3. Remove old API route handlers

### Phase 3: Optimize

1. Add React Query for caching
2. Optimize type inference
3. Add error handling

## Resources

- [tRPC Documentation](https://trpc.io/)
- [tRPC with Next.js](https://trpc.io/docs/nextjs)
- [tRPC with Express](https://trpc.io/docs/express)
- [Zod Documentation](https://zod.dev/)
