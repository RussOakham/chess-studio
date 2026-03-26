# Project Architecture

## Overview

This document describes the architecture and design of the chess game application.

**Note:** Some diagrams below (e.g. Postgres, Express API) are partially outdated. The app uses **Convex** for data, real-time subscriptions, and backend logic. The "Service communication" and environment setup reflect the current Convex-based architecture where described.

## High-Level Architecture

### Monorepo Structure (Turbo)

```text
chess-game/
├── apps/
│   ├── web/                 # Next.js frontend + Auth API routes
│   │   ├── app/            # Next.js App Router
│   │   │   ├── api/        # Auth endpoints (Better Auth)
│   │   │   └── (routes)/   # Frontend routes
│   │   ├── components/     # React components
│   │   └── lib/            # Client-side utilities
│   └── api/                # Backend API (Express.js or Go)
│       ├── routes/         # API endpoints
│       ├── services/       # Business logic
│       └── engine/         # Chess engine integration
├── packages/
│   ├── ui/                 # Shared UI components
│   ├── types/              # Shared TypeScript types
│   ├── chess/              # Shared chess logic
│   └── db/                 # Drizzle schema and migrations
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.api
│   └── docker-compose.yml
└── docs/
```

## System Architecture

### Hybrid Architecture (Selected)

```text
┌─────────────────┐
│   Next.js Web   │  (Frontend + Auth API Routes)
│                 │
│  ┌───────────┐  │
│  │  React UI │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ Auth API  │  │ (Better Auth)
│  └───────────┘  │
└────────┬────────┘
         │
         │ (Auth requests)
         │
    ┌────▼──────────────────┐
    │   Express/Go API      │  (Game Logic, Engine)
    │                       │
    │  ┌─────────────────┐ │
    │  │ Game Service    │ │
    │  │ Engine Service  │ │
    │  │ AI Service      │ │
    │  └─────────────────┘ │
    └────┬──────────┬───────┘
         │          │
    ┌────▼───┐  ┌───▼────┐
    │   DB   │  │Stockfish│
    │(Postgres)│ │ Engine │
    └────────┘  └────────┘
```

### Deployment Architecture (Docker Compose)

```text
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│         (via Dokploy)                   │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼───┐  ┌────▼────┐  ┌───▼────┐
│  Web  │  │   API   │  │   DB   │
│(Next.js)│ │(Express/Go)│ │(Postgres)│
│ Docker │  │  Docker │  │ Docker │
└────────┘  └─────────┘  └────────┘
    │           │           │
    └───────────┴───────────┘
                │
         ┌──────▼──────┐
         │  Stockfish  │
         │  (Process)  │
         └─────────────┘
```

## Component Structure

### Frontend (Next.js App Router)

```text
app/
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── games/
│   │   ├── [id]/          # Game detail/review
│   │   └── new/           # New game
│   ├── history/           # Game history list
│   └── profile/
└── api/
    └── auth/              # Auth endpoints (Better Auth)
                          # Note: Game API calls go to separate backend
```

### Backend API (Express.js or Go)

```text
api/
├── routes/
│   ├── games/             # Game CRUD operations
│   ├── moves/             # Move submission and validation
│   ├── analysis/          # Position analysis (Stockfish)
│   ├── hints/             # AI move hints
│   └── reviews/           # Game review generation
├── services/
│   ├── game.service.ts    # Game business logic
│   ├── engine.service.ts  # Stockfish integration
│   ├── ai.service.ts      # LLM integration for hints/reviews
│   └── db.service.ts      # Database operations (Drizzle)
└── middleware/
    ├── auth.middleware.ts # JWT/session validation
    └── rate-limit.ts      # Rate limiting
```

### Key Components

- `ChessBoard`: Main game board component
- `GameControls`: Move controls, engine settings
- `EvaluationBar`: Engine evaluation display
- `MoveList`: Move history sidebar
- `GameReview`: Post-game analysis view
- `HintPanel`: AI move suggestions

## Data Flow

### Game Play Flow

1. User authenticates → Next.js Auth API (Better Auth)
2. User creates new game → Frontend calls Backend API → Creates game record in DB
3. User makes move → Frontend validates with chess.js
4. Move sent to Backend API → API stores move in DB
5. **Client-side**: Stockfish WASM evaluates position (quick eval, depth 5-8) → Updates evaluation bar
6. Frontend updates board and evaluation display
7. **Server-side**: Engine move (if playing vs engine) → Frontend calls `POST /api/games/[gameId]/engine/move` → Backend API uses Stockfish WASM to calculate best move (depth 10-20+ based on difficulty)
8. Engine move stored in DB → Frontend receives move → Board updates → Cycle continues

### Game Review Flow

1. Game ends → Backend API marks game as completed
2. User requests review → Frontend calls Backend API
3. Backend API fetches all moves → Sends to LLM → Generates summary and key moments
4. Review stored in DB → Displayed to user

## API Design

### Next.js Auth API (Better Auth)

- Handled by Better Auth library
- Endpoints: `/api/auth/*` (login, register, session, etc.)

### Backend API (Express.js/Go)

#### Base URL

- Development: `http://localhost:3001/api`
- Production: `https://api.yourdomain.com/api` (or subdomain)

#### Games

- `GET /api/games` - List user's games (requires auth token)
- `POST /api/games` - Create new game
- `GET /api/games/:id` - Get game details
- `PATCH /api/games/:id` - Update game (resign, draw, etc.)
- `DELETE /api/games/:id` - Delete game

#### Moves

- `POST /api/games/:id/moves` - Submit move
- `GET /api/games/:id/moves` - Get all moves for game

#### Engine & Analysis

- `POST /api/games/:id/engine/move` - Get engine move (uses Stockfish WASM server-side)
- `POST /api/analysis/evaluate` - Deep position evaluation (optional, for game reviews)
- `POST /api/analysis/hint` - Get AI move hint (Stockfish + LLM)
- `POST /api/games/:id/review` - Generate game review (Stockfish analysis + LLM)

#### History

- `GET /api/games/history` - Get game history with filters (pagination, date range, etc.)

### Authentication Flow

1. User logs in via Next.js Auth API → Receives session cookie
2. Frontend includes session token in requests to Backend API
3. Backend API validates token with Next.js Auth session
4. Alternative: JWT tokens passed from Next.js to Backend API

## Integration Points

### Chess Engine (Stockfish) - Hybrid Approach

We use `stockfish.wasm` (WebAssembly) in both client and server environments for optimal performance and flexibility.

**Client-Side (Browser):**

- **Purpose**: Real-time position evaluation, move hints, legal move highlighting
- **Library**: `stockfish.wasm` runs directly in the browser
- **Use Cases**:
  - Quick position evaluation (depth 5-8) for UI feedback
  - Highlighting legal moves on hover
  - Showing evaluation bar in real-time
  - Move suggestions/hints (shallow analysis)
- **Benefits**: Instant feedback, no network latency, better UX
- **Limitations**: Limited depth to avoid blocking UI, uses user's CPU

**Server-Side (API):**

- **Purpose**: Engine moves, deeper analysis, game reviews, controlled difficulty
- **Library**: `stockfish.wasm` runs in Node.js API routes
- **Use Cases**:
  - Calculating engine moves (depth 10-20+ based on difficulty)
  - Deep position analysis for game reviews
  - Post-game analysis and evaluation
  - AI integration (LLM hints, game summaries)
- **Benefits**:
  - Controlled difficulty levels
  - Rate limiting and cost control
  - Consistent performance
  - Server CPU resources
  - Integration with AI services
- **API Endpoint**: `POST /api/games/[gameId]/engine/move`

**Communication:**

- Client-side: Direct JavaScript API calls to WASM module
- Server-side: JavaScript API calls to WASM module in Node.js
- Client ↔ Server: HTTP REST API for engine moves

### AI Integration

- **Move Hints**: Stockfish best moves → LLM API → Human-readable hints
- **Game Reviews**: Full game PGN → LLM API → Summary and analysis

### Database Schema (High-Level)

```sql
users (id, email, name, created_at)
games (id, user_id, white_player, black_player, result, pgn, created_at, completed_at)
moves (id, game_id, move_number, move_san, move_uci, fen_before, fen_after, evaluation, created_at)
game_reviews (id, game_id, summary, key_moments, created_at)
```

## Security Considerations

- Authentication via Better Auth (handles sessions, tokens)
- API routes protected by auth middleware
- Rate limiting on engine/AI endpoints (cost control)
- Input validation on all moves (prevent invalid positions)
- CORS configuration for API access

## Performance Considerations

- **Hybrid Engine Approach**: Client-side for quick evaluations (no network latency), server-side for deep analysis
- Cache Stockfish evaluations for common positions (both client and server)
- Debounce client-side evaluation requests during rapid moves
- Limit client-side depth to 5-8 to avoid blocking UI thread
- Server-side engine moves use deeper analysis (10-20+ depth) based on difficulty
- Paginate game history
- Index database on user_id, game_id for fast queries
- Consider WebSocket for real-time updates (future enhancement)
- Docker containers allow independent scaling of services
- Client-side WASM reduces server load for common operations

## Deployment Architecture

### Docker Compose Structure

```yaml
services:
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:3001
      - NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL} # Convex (games + auth)

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - STOCKFISH_PATH=/usr/bin/stockfish

# Note: All persisted data (games and auth) is in Convex. Neon and Drizzle are not used.
```

### Deployment Flow (Dokploy)

1. **Code Push** → Git repository
2. **Dokploy Webhook** → Triggers build
3. **Docker Build** → Creates images for web and api
4. **Docker Compose** → Orchestrates services
5. **Nginx** → Routes traffic (via Dokploy or separate container)
   - `/` → Next.js web app
   - `/api/*` → Backend API service
6. **DNS** → Route 53 points custom domain to VPS

### Service Communication

- **Frontend → Convex**: Convex client (WebSocket/HTTP) for game/move queries and mutations and for auth; real-time subscriptions
- **Frontend → Next.js API**: Better Auth routes (e.g. `/api/auth/*`) proxy to Convex
- **Convex**: Stores games, moves, and auth data (Better Auth component); no Neon or Drizzle
- **Stockfish**: Client-side WASM (browser) or server process/UCI
- **LLM API**: HTTP requests (OpenAI/Anthropic) for AI features

### Environment Variables

All secrets managed via **Doppler**:

- **Web**: `NEXT_PUBLIC_CONVEX_URL`, Better Auth secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.)
- **API** (if used): `STOCKFISH_PATH`, `OPENAI_API_KEY`, `JWT_SECRET`
- **Convex**: Deployment URL; auth is Better Auth with data stored in Convex (see [`convex-auth-data.md`](./convex-auth-data.md)). Neon and Drizzle are not used.

Doppler service tokens injected into containers at runtime via Docker Compose integration.
