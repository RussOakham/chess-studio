# tRPC Migration Plan

## Overview

This document outlines the migration strategy from the current axios-based API calls to tRPC for end-to-end type safety. The migration will leverage our existing 4-layer architecture (Route → Controller → Service → Data-access) while adding tRPC's type-safe communication layer.

## Current State

### Current Architecture

```text
Frontend (React)
  ↓ axios.fetch()
Next.js API Route (/api/games/route.ts)
  ↓
Controller (games.controller.ts)
  ↓
Service (games.service.ts)
  ↓
Repository (games.repository.ts)
  ↓
Database (Drizzle ORM)
```

### Current Implementation

- **Frontend**: Uses `axios` client (`apps/web/lib/api/client.ts`)
- **API Routes**: Next.js App Router route handlers (`apps/web/app/api/games/route.ts`)
- **Layers**: Controller → Service → Repository pattern
- **Validation**: Zod schemas in `apps/web/lib/validations/`
- **Types**: Shared types in `apps/web/lib/types/api.ts`

## Target Architecture with tRPC

### New Architecture

```text
Frontend (React)
  ↓ trpc.game.create.useMutation()
tRPC Router (apps/web/lib/trpc/routers/games.router.ts)
  ↓
Controller (games.controller.ts) - Reused
  ↓
Service (games.service.ts) - Reused
  ↓
Repository (games.repository.ts) - Reused
  ↓
Database (Drizzle ORM)
```

### Benefits

- **End-to-end type safety**: Types flow from database → tRPC → frontend
- **No manual type definitions**: Types inferred from tRPC procedures
- **Better DX**: Full autocomplete and compile-time error checking
- **Runtime validation**: Zod schemas validate at runtime
- **Reuse existing layers**: Controller/Service/Repository remain unchanged

## Migration Strategy

### Phase 1: Setup tRPC Infrastructure

#### 1.1 Install Dependencies

```bash
pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next
pnpm add @tanstack/react-query
```

#### 1.2 Create tRPC Context

**File**: `apps/web/lib/trpc/context.ts`

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

export async function createContext(opts?: CreateNextContextOptions) {
  const session = await auth.api.getSession({
    headers: opts?.req.headers ?? (await headers()),
  });

  return {
    session,
    userId: session?.user.id,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

#### 1.3 Initialize tRPC

**File**: `apps/web/lib/trpc/init.ts`

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { createContext, type Context } from "./context";

const t = initTRPC.context<Context>().create();

// Base router and procedure
export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  });
});
```

#### 1.4 Create Games Router

**File**: `apps/web/lib/trpc/routers/games.router.ts`

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { GamesRepository } from "@/lib/data-access/games.repository";
import { GamesService } from "@/lib/services/games.service";
import { newGameSchema } from "@/lib/validations/game";

// Initialize service layer (reuse existing)
const repository = new GamesRepository();
const service = new GamesService(repository);

export const gamesRouter = router({
  // List user's games
  list: protectedProcedure.query(async ({ ctx }) => {
    const games = await service.listUserGames(ctx.userId);
    return games;
  }),

  // Create new game
  create: protectedProcedure
    .input(newGameSchema)
    .mutation(async ({ ctx, input }) => {
      const game = await service.createGame(ctx.userId, input);
      return game;
    }),

  // Get game by ID (future)
  getById: protectedProcedure
    .input(z.object({ gameId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Implementation when ready
      throw new Error("Not implemented");
    }),
});
```

#### 1.5 Create Root Router

**File**: `apps/web/lib/trpc/routers/_app.ts`

```typescript
import { router } from "../init";
import { gamesRouter } from "./games.router";

export const appRouter = router({
  games: gamesRouter,
});

export type AppRouter = typeof appRouter;
```

#### 1.6 Create tRPC API Handler

**File**: `apps/web/app/api/trpc/[trpc]/route.ts`

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/routers/_app";
import { createContext } from "@/lib/trpc/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(),
  });

export { handler as GET, handler as POST };
```

#### 1.7 Setup tRPC Client (Frontend)

**File**: `apps/web/lib/trpc/client.ts`

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "./routers/_app";

export const trpc = createTRPCReact<AppRouter>();
```

#### 1.8 Setup tRPC Provider

**File**: `apps/web/lib/trpc/provider.tsx`

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### 1.9 Add Provider to Root Layout

**File**: `apps/web/app/layout.tsx`

Add the TRPCProvider to wrap the app:

```typescript
import { TRPCProvider } from "@/lib/trpc/provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
```

### Phase 2: Migrate Frontend Calls

#### 2.1 Update New Game Page

**File**: `apps/web/app/game/new/page.tsx`

Replace axios call with tRPC:

```typescript
// Before
const response = await apiClient.post<CreateGameResponse>("/games", data);
router.push(`/game/${response.data.id}`);

// After
const createGame = trpc.games.create.useMutation({
  onSuccess: (data) => {
    router.push(`/game/${data.id}`);
    router.refresh();
  },
  onError: (error) => {
    setFormError("root", {
      message: error.message || "Failed to create game",
    });
  },
});

// In onSubmit:
createGame.mutate(data);
```

#### 2.2 Update Home Page (if using API)

**File**: `apps/web/app/page.tsx`

Replace direct database calls with tRPC:

```typescript
// Before: Direct database query in server component
const activeGames = await db.select()...

// After: Use tRPC in client component or create server-side helper
// Option 1: Create server-side tRPC caller
import { createCaller } from "@/lib/trpc/routers/_app";
const caller = createCaller({ session });
const games = await caller.games.list();

// Option 2: Keep server component, use tRPC internally
// (tRPC can be called server-side too)
```

### Phase 3: Remove Old API Routes

#### 3.1 Deprecate Old Routes

1. Keep old routes temporarily for backward compatibility
2. Add deprecation warnings
3. Update all frontend calls to use tRPC

#### 3.2 Remove Old Files

Once all calls are migrated:

- Remove `apps/web/app/api/games/route.ts`
- Remove `apps/web/lib/api/client.ts` (axios client)
- Remove axios dependency from package.json

### Phase 4: Future Endpoints

All future endpoints follow the same pattern:

**Example: Move Endpoint**

```typescript
// apps/web/lib/trpc/routers/games.router.ts
export const gamesRouter = router({
  // ... existing procedures

  makeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.string().uuid(),
        from: z.string(),
        to: z.string(),
        promotion: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use existing service layer
      return service.makeMove(ctx.userId, input);
    }),
});
```

**Frontend Usage:**

```typescript
const makeMove = trpc.games.makeMove.useMutation();

makeMove.mutate({
  gameId: "123",
  from: "e2",
  to: "e4",
});
```

## File Structure After Migration

```text
apps/web/
├── app/
│   ├── api/
│   │   └── trpc/
│   │       └── [trpc]/
│   │           └── route.ts          # tRPC API handler
│   └── layout.tsx                      # Includes TRPCProvider
├── lib/
│   ├── trpc/
│   │   ├── client.ts                   # tRPC React client
│   │   ├── context.ts                  # tRPC context
│   │   ├── init.ts                     # tRPC initialization
│   │   ├── provider.tsx                 # tRPC React provider
│   │   └── routers/
│   │       ├── _app.ts                 # Root router
│   │       └── games.router.ts          # Games router
│   ├── controllers/                     # Keep (used by tRPC routers)
│   ├── services/                       # Keep (used by tRPC routers)
│   ├── data-access/                    # Keep (used by services)
│   └── types/                          # Keep (shared types)
```

## Migration Checklist

### Phase 1: Setup

- [ ] Install tRPC dependencies
- [ ] Create tRPC context (`lib/trpc/context.ts`)
- [ ] Initialize tRPC (`lib/trpc/init.ts`)
- [ ] Create games router (`lib/trpc/routers/games.router.ts`)
- [ ] Create root router (`lib/trpc/routers/_app.ts`)
- [ ] Create tRPC API handler (`app/api/trpc/[trpc]/route.ts`)
- [ ] Create tRPC client (`lib/trpc/client.ts`)
- [ ] Create TRPCProvider (`lib/trpc/provider.tsx`)
- [ ] Add provider to root layout

### Phase 2: Migrate Frontend

- [ ] Update new game page to use tRPC
- [ ] Update home page (if needed)
- [ ] Test all API calls work correctly

### Phase 3: Cleanup

- [ ] Remove old API routes (`app/api/games/route.ts`)
- [ ] Remove axios client (`lib/api/client.ts`)
- [ ] Remove axios from package.json
- [ ] Update documentation

### Phase 4: Future Endpoints

- [ ] Add move endpoint when implementing Phase 2.1
- [ ] Add engine endpoint when implementing Phase 2.3
- [ ] Add resign/draw endpoints when implementing Phase 3.2

## Key Decisions

### 1. Keep 4-Layer Architecture

**Decision**: Reuse existing Controller/Service/Repository layers

**Rationale**:

- tRPC routers call services directly (skip controllers)
- Services and repositories remain unchanged
- Maintains separation of concerns
- Easier migration path

**Alternative Considered**: Remove controllers, call services directly from tRPC

- **Rejected**: Controllers provide value for complex validation/transformation

### 2. tRPC Router Calls Services Directly

**Decision**: tRPC routers → Services → Repositories

**Rationale**:

- Controllers were mainly for HTTP request/response handling
- tRPC handles request/response, so controllers become redundant
- Services contain business logic (what we need)
- Simpler call chain

**Note**: Can still use controllers if complex request transformation needed

### 3. Server-Side vs Client-Side

**Decision**: Use tRPC on both server and client

**Rationale**:

- Server components can use tRPC caller
- Client components use React Query hooks
- Consistent API surface
- Type safety everywhere

### 4. Authentication

**Decision**: Use protected procedures with context

**Rationale**:

- Context provides session/userId
- Protected procedures enforce auth
- Reuses existing Better Auth setup
- Type-safe user context

## Type Safety Flow

```text
Database Schema (Drizzle)
  ↓ InferSelectModel
Repository Types
  ↓
Service Return Types
  ↓
tRPC Procedure Output Types
  ↓ Type Inference
Frontend Types (automatic)
```

## Benefits After Migration

1. **End-to-end type safety**: Database → API → Frontend
2. **No manual type definitions**: Types inferred automatically
3. **Compile-time errors**: Catch API mismatches before runtime
4. **Better DX**: Full autocomplete in IDE
5. **Runtime validation**: Zod validates all inputs
6. **Reactive updates**: React Query handles caching/refetching
7. **Simpler code**: No manual fetch/axios calls

## Potential Challenges

### 1. Server Components

**Challenge**: Server components can't use React hooks

**Solution**: Use tRPC caller for server-side:

```typescript
import { createCaller } from "@/lib/trpc/routers/_app";
import { createContext } from "@/lib/trpc/context";

const ctx = await createContext();
const caller = createCaller(ctx);
const games = await caller.games.list();
```

### 2. Error Handling

**Challenge**: tRPC errors need proper handling

**Solution**: Use tRPC error codes and messages:

```typescript
onError: (error) => {
  if (error.data?.code === "UNAUTHORIZED") {
    // Handle auth error
  }
  // Handle other errors
};
```

### 3. Migration Period

**Challenge**: Need to support both old and new APIs during migration

**Solution**:

- Keep old routes during migration
- Migrate one endpoint at a time
- Remove old routes after full migration

## Testing Strategy

1. **Unit Tests**: Test tRPC procedures in isolation
2. **Integration Tests**: Test full flow (router → service → repository)
3. **E2E Tests**: Test frontend → tRPC → database
4. **Type Tests**: Verify types flow correctly

## Timeline Estimate

- **Phase 1 (Setup)**: 4-6 hours
- **Phase 2 (Migrate Frontend)**: 2-3 hours
- **Phase 3 (Cleanup)**: 1 hour
- **Total**: ~7-10 hours

## Next Steps

1. Review and approve this migration plan
2. Start with Phase 1: Setup tRPC infrastructure
3. Test with one endpoint (create game)
4. Migrate remaining endpoints
5. Remove old API routes

## References

- [tRPC Documentation](https://trpc.io/)
- [tRPC with Next.js App Router](https://trpc.io/docs/nextjs)
- [tRPC React Query Integration](https://trpc.io/docs/react-query)
- [Type Safety Strategy](../planning/type-safety-strategy.md)
