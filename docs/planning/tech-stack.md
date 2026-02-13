# Tech Stack

## Overview

This document outlines the technology stack for the chess game project.

## Recommended Stack

### Monorepo Structure

**Turbo Repo** ✅

- Excellent for managing multiple services (frontend, API, chess engine service)
- Enables code sharing and consistent tooling
- Great for development experience with hot reloading across services
- Recommended structure:

  ```text
  apps/
    ├── web/          # Frontend application
    ├── api/          # Main API backend
    └── engine/       # Chess engine service (optional separate service)
  packages/
    ├── ui/           # Shared UI components
    ├── types/        # Shared TypeScript types
    └── chess/        # Shared chess logic/utilities
  ```

### Frontend

**Next.js 14+ (App Router)** ✅ **Recommended**

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

### Backend Architecture

#### Hybrid Approach ✅ **Selected**

- **Next.js API Routes** (`apps/web/api`): Handles authentication (Better Auth integration)
  - Simple, lightweight auth endpoints
  - Leverages Next.js middleware for session management
  - Good for auth-related operations
- **Separate Backend Service** (`apps/api`): Express.js or Go
  - **Express.js Option**: TypeScript, shared codebase, easier to start
  - **Go Option**: Higher performance, better for CPU-intensive operations (engine coordination)
  - Handles: Game logic, database operations, chess engine coordination, AI integration
  - Performance-critical operations (move validation, engine communication)

**Rationale for Hybrid**:

- Auth is simple and benefits from Next.js integration
- Game engine operations are performance-critical (Go excels here)
- Docker deployment makes service separation natural
- Can scale backend independently
- Learning opportunity with Go

**Recommendation**: Start with Express.js for faster development, migrate engine-heavy operations to Go later if needed.

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
- Next.js `/api/auth/*` routes proxy to Convex; no separate auth database
- **Neon and Drizzle are retired** – not used for auth or games

### Chess Engine

**Stockfish** ✅ **Recommended**

- Industry standard, open-source
- Multiple integration options:
  - **stockfish.js**: Browser-based (good for client-side evaluation)
  - **stockfish-nnue.wasm**: WebAssembly version (fast, browser-compatible)
  - **Stockfish binary**: Server-side via child process (most powerful)
- Can run at different skill levels
- Provides position evaluation, best moves, analysis

### AI Integration

**For Move Hints & Game Reviews**:

- **Option 1**: Use Stockfish analysis + prompt engineering
  - Stockfish provides move evaluation
  - LLM (OpenAI/Anthropic) generates human-readable hints/summaries
- **Option 2**: Fine-tuned chess model (more complex, future enhancement)
- **Recommendation**: Start with Stockfish + LLM API (OpenAI GPT-4 or Claude)

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
- **Alternative** (future): better-convex for tRPC-style procedures on top of Convex

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
- See `docs/planning/typescript-go-strategy.temp.md` for detailed strategy

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

### Deployment Stack

- **Infrastructure as Code**: Terraform
- **VPS**: Hostinger (or similar private VPS)
- **Deployment Management**: Dokploy (or similar Docker-based deployment tool)
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **Secrets Management**: Doppler
- **DNS**: Amazon Route 53 (custom domain, managed by Terraform)
- **Reverse Proxy**: Nginx (via Dokploy or separate container)
- **Backup Storage**: AWS S3 (managed by Terraform)

## Decision Summary

| Component           | Choice                                           | Rationale                                           |
| ------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Monorepo            | Turbo Repo                                       | Multi-service management, code sharing              |
| Frontend            | Next.js 14+                                      | Full-stack capabilities, auth integration, SSR      |
| Auth                | Better Auth + Convex                             | Auth data and sessions stored in Convex             |
| Backend             | Next.js API (auth) + Convex (games/moves)        | Auth + Convex for game data and real-time           |
| TypeScript Compiler | TypeScript 6.x (now), 7.0 (future)               | 10x faster with Go-based compiler                   |
| Game data / API     | Convex                                           | Real-time, type-safe queries/mutations, Better Auth |
| Caching             | TBD (Start without, add Redis/Upstash if needed) | Performance optimization                            |
| Chess Engine        | Stockfish                                        | Industry standard, client-side WASM                 |
| AI                  | Stockfish + LLM API                              | Best moves from engine, summaries from LLM          |
| Language            | TypeScript                                       | Type safety, better DX                              |
| Type Safety         | Convex                                           | End-to-end type safety for game/move API            |
| Styling             | Tailwind CSS                                     | Utility-first CSS framework                         |
| UI Components       | ShadCN UI                                        | Component library built on Radix UI                 |
| Chess Board         | Custom 2D (SVG icons)                            | Full control, brand consistency                     |
| 3D Board (Future)   | Three.js + @react-three/fiber                    | 3D rendering for enhanced board view                |

## Alternative Considerations

### If you prefer lighter setup

- React + Vite instead of Next.js
- SQLite for development (PostgreSQL for production)
- NextAuth.js instead of Better Auth

### If you need more control

- Separate Express/Fastify backend instead of Next.js API routes
- Custom auth implementation (more work, more control)
