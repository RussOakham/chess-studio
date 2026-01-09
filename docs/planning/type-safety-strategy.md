# Type Safety Strategy

## Overview

This document outlines the end-to-end type safety strategy for the chess game application, ensuring type safety between frontend and backend services.

## Type Safety Solution

### tRPC ✅ **Selected**

**Why tRPC?**

- **Full-stack TypeScript**: Types flow automatically from backend to frontend
- **No Code Generation**: Types are inferred at compile time
- **Excellent DX**: Full autocomplete and type checking in IDE
- **Runtime Safety**: Validates requests at runtime
- **Works with Next.js**: Excellent integration
- **Works with Express.js**: Can be used with separate backend
- **Small Bundle Size**: Minimal runtime overhead

## Architecture

### tRPC Setup

**Frontend (Next.js)**:

- tRPC React Query integration
- Type-safe API calls
- Automatic request/response typing

**Backend (Express.js)**:

- tRPC router definition
- Procedure definitions with input/output types
- Type inference for all procedures

### Type Flow

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

## Implementation

### Backend tRPC Router

```typescript
// apps/api/src/routers/game.ts
import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const gameRouter = router({
  create: publicProcedure
    .input(z.object({
      difficulty: z.enum(['easy', 'medium', 'hard']),
      color: z.enum(['white', 'black']).optional(),
    }))
    .output(z.object({
      gameId: z.string(),
      fen: z.string(),
      turn: z.enum(['white', 'black']),
    }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
      return { gameId: '...', fen: '...', turn: 'white' };
    }),

  makeMove: publicProcedure
    .input(z.object({
      gameId: z.string(),
      from: z.string(),
      to: z.string(),
      promotion: z.string().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      fen: z.string(),
      move: z.object({
        from: z.string(),
        to: z.string(),
        san: z.string(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Implementation
    }),

  getGame: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .output(z.object({
      id: z.string(),
      fen: z.string(),
      pgn: z.string(),
      moves: z.array(z.object({
        from: z.string(),
        to: z.string(),
        san: z.string(),
      })),
    }))
    .query(async ({ input, ctx }) => {
      // Implementation
    }),
});
```

### Frontend tRPC Client

```typescript
// apps/web/src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@repo/api/src/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

### Usage in Components

```typescript
// apps/web/src/components/GameBoard.tsx
import { trpc } from '@/lib/trpc';

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
export type GameStatus = 'in_progress' | 'checkmate' | 'stalemate' | 'draw' | 'resigned';

export type GameColor = 'white' | 'black';

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

### Drizzle ORM Integration

- Drizzle schema types flow through tRPC
- Database types → tRPC types → Frontend types
- Full type safety from database to UI

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
