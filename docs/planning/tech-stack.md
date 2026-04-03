# Tech Stack

## Overview

This document outlines the technology stack for the chess game project.

## Recommended Stack

### Monorepo Structure

**Turborepo** ✅

- Builds and caches `apps/web` plus shared packages (`chess`, `types`, TS configs)
- **Current layout** — single web app; **no** `apps/api` or separate engine service (Stockfish runs **in the browser**)

  ```text
  chess-studio/
    apps/
      web/            # Next.js + Convex (convex/ under web)
    packages/
      chess/          # Shared chess logic
      types/          # Shared types
      config/         # Shared TypeScript configs
  ```

### Frontend

**Next.js 16 (App Router)** ✅ **In use**

- **Why Next.js over React**:
  - Built-in API routes for backend integration
  - Server-side rendering for better SEO (if needed)
  - Excellent auth integration with middleware
  - File-based routing simplifies navigation
  - Built-in optimizations (image, font, etc.)
  - Can handle both client-side game logic and server-side API calls
- **Alternative**: React + Vite (if you prefer lighter setup, but Next.js recommended for this use case)

### Authentication

**Better Auth** ✅ **Recommended**

- Modern, type-safe authentication solution
- Works excellently with Next.js
- Supports multiple providers
- Good developer experience
- Alternative: NextAuth.js (Auth.js) - also solid, more established

### Backend architecture

#### Convex + Next.js route handlers ✅ **Selected**

- **Convex** (`apps/web/convex/`): Games, moves, game reviews, Lichess explorer cache, auth-linked data; queries, mutations, **actions** (e.g. AI summary, external HTTP).
- **Next.js App Router**: UI, Server Components, and **Better Auth** HTTP handler under `app/api/auth/*` (proxies to Convex). No separate Express/Go game service.
- **Chess engine**: **Client-side Stockfish** (worker); not a dedicated server engine microservice.

### Game data & real-time backend

**Convex** ✅ **Selected** (for games and moves)

- **Real-time**: Subscriptions for live game/move updates (no polling)
- **Type-safe**: Queries and mutations with full TypeScript inference
- **Backend-as-a-service**: Schema, queries, mutations, and auth (Better Auth JWT) in one stack
- **Location**: `apps/web/convex/` (schema, `games.ts` for game/move functions)
- Games, moves, and game_reviews (for future AI) live in Convex; auth identity comes from Better Auth

**Rationale**: Real-time board updates, simpler backend surface, and strong typing without a separate API layer for game operations.

### Auth

**Better Auth + Convex** ✅ **Selected**

- **Better Auth** handles sign-in, sessions, and user identity
- **Auth data** (user, session, account, etc.) is stored in **Convex** via the `@convex-dev/better-auth` component
- Next.js `/api/auth/*` routes proxy to Convex

### Chess Engine

**Stockfish** ✅ **Recommended**

- Industry standard, open-source
- Multiple integration options:
  - **stockfish.js**: Browser-based (good for client-side evaluation)
  - **stockfish-nnue.wasm**: WebAssembly version (fast, browser-compatible)
  - **Stockfish binary**: Server-side via child process (most powerful)
- Can run at different skill levels
- Provides position evaluation, best moves, analysis

### AI integration

**Current approach:**

- **Move hints & classifications** — Stockfish on the client (`use-hint`, `run-game-analysis`).
- **Post-game LLM summary** — Optional: **Vercel AI Gateway** + AI SDK `generateText` in Convex `"use node"` actions (`apps/web/lib/ai/`, `convex/ai_game_summary.ts`). Model ID from env; requires `AI_GATEWAY_API_KEY`.
- **Future** — MultiPV-backed “explain this line/position” and richer coaching copy; see [`learning-and-feedback-enhancements.md`](./learning-and-feedback-enhancements.md) and [`engine-lines-multipv-prd.md`](./engine-lines-multipv-prd.md).

### Caching

**Caching Strategy** (To be evaluated during MVP):

**Potential Use Cases**:

- **Stockfish Position Evaluations**: Cache common position evaluations
- **Game State**: Cache active game states for quick retrieval
- **API Responses**: Cache frequently accessed data (game history, user profiles)
- **Session Data**: Better Auth may handle this, but Redis could help

**Options**:

- **Redis/Upstash**: In-memory caching, fast lookups
  - **Upstash**: Serverless Redis, good free tier, pay-per-request
  - **Redis**: Traditional Redis (self-hosted or managed)
- **Convex**: Game and auth data; add dedicated cache only if needed
- **Next.js Cache**: Built-in caching for static/API routes

**Recommendation**: Start without dedicated cache (use Convex + Next.js cache), add Redis/Upstash later if performance issues arise.

### Type Safety

**End-to-End Type Safety** ✅ **Required**

- **Convex** ✅ **Selected** (for game/move API)
  - Full-stack TypeScript types for queries and mutations
  - Type-safe API calls via `useQuery(api.games.getById, { gameId })` and `useMutation(api.games.makeMove)`
  - Automatic type inference from Convex function definitions
  - No code generation needed; types from `convex/_generated`
  - Works with Next.js; auth via Better Auth JWT

**Rationale**:

- Ensures type safety between frontend and Convex backend
- Catches API contract mismatches at compile time
- Real-time subscriptions and single backend for game state

**TypeScript 7.0 (Native Go-based Compiler)** 🔮 **Future**:

- Microsoft is rewriting TypeScript compiler in Go (codename "Corsa")
- **10x faster** compilation and type checking
- **8x faster** editor load times
- **50% less memory** usage
- Still compiles TypeScript → JavaScript (same output)
- **Linting**: Use `oxlint-tsgolint` (already in use for type-aware linting)
  - `oxlint` with `oxlint-tsgolint` for type-aware linting (current setup)
  - `tsgolint` for TypeScript 7.0 (when available, will integrate with oxlint)
- **Timeline**: Preview mid-2025, stable release end of 2025
- **No code changes needed** - just faster tooling
- Strategy details: follow the official TypeScript/oxlint release notes when upgrading; no separate local strategy doc.

### Code Quality Tools

**Linting**: **oxlint** ✅ **Selected**

- High-performance Rust-based linter
- Type-aware linting via `oxlint-tsgolint` (Go-based TypeScript type checker)
- Built-in plugins: unicorn, typescript, jsx-a11y, react, react-perf, import, nextjs, promise, node
- ESLint only used for JSON/YAML file validation
- Replaces ESLint for all TypeScript/JavaScript linting

**Formatting**: **oxfmt** ✅ **Selected**

- High-performance Rust-based formatter
- Prettier-compatible configuration
- Experimental features:
  - Import sorting (automatic import organization)
  - Tailwind CSS class sorting (automatic class ordering)
- Replaces Prettier entirely

### Styling

**Tailwind CSS** ✅ **Selected**

- **Version**: Latest (v4.x when available, or v3.x)
- Utility-first CSS framework
- Excellent for rapid UI development
- Great with Next.js
- Custom configuration for design system

**ShadCN UI** ✅ **Selected**

- Component library built on Radix UI
- Copy-paste components (not a dependency)
- Fully customizable
- Built with Tailwind CSS
- TypeScript support
- Accessible by default
- Perfect for building custom design system

**Styling Stack**:

- Tailwind CSS (utility classes)
- ShadCN UI (base components)
- Custom components built on ShadCN
- CSS variables for theming

### Chess Board Implementation

**2D Board (MVP)** ✅ **Initial Implementation**

**Options for Chess Piece Icons**:

- **Option 1: Custom SVG Icons** ✅ **Recommended**
  - Full control over design
  - Consistent with brand
  - Lightweight
  - Easy to customize
  - No external dependencies
- **Option 2: Third-Party Package**
  - `chess-pieces` npm package
  - `react-chess-pieces`
  - Pros: Quick setup, pre-made icons
  - Cons: Less customization, dependency

**Recommendation**: Start with custom SVG icons for full control and brand consistency.

**Chess Board Library**:

- **react-chessboard** or **custom implementation**
  - react-chessboard: Good starting point, customizable
  - Custom: Full control, can integrate with chess.js easily
- **Chess.js**: For game logic, move validation, FEN/PGN handling

**3D Board (Enhanced Feature - Phase 2+)** 🔮 **Future**

- **Three.js** ✅ **Recommended**
  - Industry standard 3D library
  - WebGL rendering
  - Great performance
  - Large ecosystem
  - React integration via `@react-three/fiber`
- **Alternative**: Babylon.js (more features, larger bundle size)

**3D Board Implementation**:

- Use `@react-three/fiber` for React integration
- Custom 3D models for pieces (GLTF/GLB)
- Camera controls for board rotation
- Smooth animations for moves
- Toggle between 2D and 3D views

### Additional Tools

- **TypeScript**: Type safety across the stack
- **Chess.js**: JavaScript chess library for move validation, game state
- **Zustand/Redux**: State management (if needed beyond React state)
- **Convex**: Game/move data and real-time subscriptions; type-safe API (see Type Safety section above)

### CI/CD Stack

- **CI/CD Platform**: GitHub Actions ✅ **Selected**
  - **Free for public repos**: Unlimited minutes
  - **Free for private repos**: 2,000 minutes/month
  - **Rationale**: Simple, free, sufficient for MVP. Can optimize Docker builds later if needed.

### Deployment stack

**This repo:** Next.js on **[Vercel](https://vercel.com)**; Convex on **Convex Cloud**; secrets often synced via **Doppler** with Vercel/CI. See [`vercel-deployment-plan.md`](./vercel-deployment-plan.md) and [`deployment.md`](./deployment.md).

## Decision summary

| Component       | Choice                                    | Rationale                                                |
| --------------- | ----------------------------------------- | -------------------------------------------------------- |
| Monorepo        | Turborepo + pnpm                          | Shared packages, cached builds                           |
| Frontend        | Next.js 16                                | App Router, Server Components, auth routes               |
| Auth            | Better Auth + Convex                      | Sessions and user rows in Convex                         |
| App backend     | Convex + Next auth routes                 | Real-time game data; no separate REST/tRPC game layer    |
| TypeScript      | 5.x / native preview (see repo)           | Strict typing across app and Convex                      |
| Game data / API | Convex                                    | Queries, mutations, actions; generated types             |
| Caching         | Convex + optional Redis later             | Add only if measured need                                |
| Chess engine    | Stockfish (client worker)                 | Evals, hints, analysis; MultiPV roadmap                  |
| AI              | Stockfish + Vercel AI Gateway (summaries) | Engine truth; LLM for optional narrative when configured |
| Language        | TypeScript                                | Shared types, Convex end-to-end                          |
| Styling         | Tailwind CSS 4                            | Utility-first                                            |
| UI              | Radix + shadcn-style components           | Accessible primitives                                    |

## Alternative considerations

- **Other hosts:** Any Node host can run Next.js; Convex stays on Convex Cloud unless you self-host Convex (unusual for this project).
- **Other auth:** NextAuth is common elsewhere; this repo standardized on **Better Auth + Convex**.
