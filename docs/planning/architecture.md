# Project Architecture

## Overview

This document describes the architecture and design of the chess game application.

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
5. Backend API requests Stockfish evaluation → Returns position eval
6. Frontend updates board and evaluation display
7. Engine move (if playing vs engine) → Backend API → Stockfish calculates best move
8. Engine move stored → Cycle continues

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

#### Analysis

- `POST /api/analysis/evaluate` - Evaluate position (Stockfish)
- `POST /api/analysis/hint` - Get AI move hint
- `POST /api/games/:id/review` - Generate game review

#### History

- `GET /api/games/history` - Get game history with filters (pagination, date range, etc.)

### Authentication Flow

1. User logs in via Next.js Auth API → Receives session cookie
2. Frontend includes session token in requests to Backend API
3. Backend API validates token with Next.js Auth session
4. Alternative: JWT tokens passed from Next.js to Backend API

## Integration Points

### Chess Engine (Stockfish)

- **Client-side**: Use stockfish.js or stockfish-nnue.wasm for real-time evaluation
- **Server-side**: Spawn Stockfish process for deeper analysis, move generation
- **Communication**: UCI protocol or JavaScript API

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

- Cache Stockfish evaluations for common positions
- Debounce evaluation requests during rapid moves
- Paginate game history
- Index database on user_id, game_id for fast queries
- Consider WebSocket for real-time updates (future enhancement)
- Go backend provides better performance for CPU-intensive engine operations
- Docker containers allow independent scaling of services

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
      - DATABASE_URL=${DATABASE_URL}  # Neon DB connection string

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}  # Neon DB connection string
      - STOCKFISH_PATH=/usr/bin/stockfish

# Note: Database is Neon DB (serverless), not a container
# DATABASE_URL is provided via Doppler secrets
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

- **Frontend → Backend**: HTTP/HTTPS (REST API)
- **Backend → Database**: Neon DB connection (serverless PostgreSQL)
- **Backend → Stockfish**: Process spawn or UCI protocol
- **Backend → LLM API**: HTTP requests (OpenAI/Anthropic)

### Environment Variables

All secrets managed via **Doppler**:

- **Web**: `NEXT_PUBLIC_API_URL`, `DATABASE_URL`, Better Auth secrets
- **API**: `DATABASE_URL`, `STOCKFISH_PATH`, `OPENAI_API_KEY`, `JWT_SECRET`
- **Database**: Neon DB connection string (via Doppler)

Doppler service tokens injected into containers at runtime via Docker Compose integration.
