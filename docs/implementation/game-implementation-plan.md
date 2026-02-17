# Game Implementation Plan

## Overview

This document outlines the high-level implementation plan for building the core chess game functionality. The plan is organized into phases that build upon each other, starting with the essential user journey and progressing to full game mechanics.

## Current Status

✅ **Completed:**

- Project setup and configuration
- Authentication system (login/register)
- Database schema (games, moves, gameReviews tables)
- Basic chess utilities package (`packages/chess`)
- Code quality tooling (oxlint with type-aware linting, oxfmt)
- **Convex migration** ✅
  - Game and move data use Convex (queries/mutations, real-time subscriptions)
  - Type-safe API via `useQuery(api.games.*)` and `useMutation(api.games.*)`
  - No polling; Convex subscriptions for live updates
- **UUID v7** (packages/db only, if used): pg_uuidv7 in Neon for time-ordered IDs; Convex uses its own document IDs
- **Phase 1.1: Home/Dashboard Page Enhancement** ✅
  - "New Game" button (prominent CTA)
  - Active games list (displays in_progress/waiting games)
  - Recent games preview (last 5 completed/abandoned games)
  - Navigation to game history (link to `/games`)
  - Empty states for no games
  - Styled with ShadCN components
- **Phase 1.2: New Game Creation Flow** ✅
  - `/game/new` page with difficulty and color selectors
  - Form validation with Zod
  - Error handling and loading states
  - Redirect to game page on success
- **Phase 1.3: Game Page Route** ✅
  - Dynamic route for `/game/[gameId]`
  - Server-side authentication and authorization checks
  - Game data via Convex (`useQuery(api.games.getById)`, `useQuery(api.games.getMoves)`)
  - Page layout with chessboard, game info, controls, and move history
  - Client component wrapper for interactive features
- **Phase 1.4: Basic Chessboard Component** ✅
  - Installed `react-chessboard` and `chess.js`
  - Created `ChessboardWrapper` component
  - Integrated drag-and-drop functionality
  - FEN position management
  - Move validation with chess.js
  - Responsive design and styling
- **Phase 2.1: Move Validation & Execution** ✅
  - Full move validation (client and server-side)
  - `makeMove` Convex mutation implemented (`api.games.makeMove`)
  - Moves stored in Convex with full metadata
  - Game FEN and PGN updated after moves
  - Game end detection (checkmate, stalemate, draw)
  - Automatic game status and result updates
  - Comprehensive error handling
- **Phase 2.2: Game State Management** ✅
  - Created `useGame` hook (Convex `useQuery(api.games.getById)`, `useQuery(api.games.getMoves)`)
  - Real-time updates via Convex subscriptions (no polling)
  - Turn indicator showing current player
  - Check/checkmate/stalemate/draw indicators
  - Move history display with proper formatting
  - Automatic UI updates after moves
  - Optimistic updates for instant visual feedback
- **Optimistic Updates** ✅
  - Instant visual feedback when moving pieces
  - Optimistic/local state; Convex reactivity for persistence
  - Automatic rollback on errors

- **Phase 2.3: Stockfish Engine Integration** ✅
  - Client-side Stockfish via `useStockfish` and `/public/engine/stockfish.js`; engine moves submitted via `makeMove` mutation. No server-side engine API (client-only implementation).
- **Phase 2.4: Game Status Detection** ✅
  - Game end (checkmate, stalemate, draw) updates status/result in Convex; UI shows result and checkmate badge. Game-end modal (AlertDialog) and king-in-check square highlight implemented.
- **Phase 3.2: Game Controls (Resign)** ✅
  - `resign` Convex mutation and Resign button with confirmation implemented. Offer draw descoped for PvE; to be added when PvP is supported.
- **Phase 3.3: Game History Page** ✅
  - `/games` page implemented (`app/games/page.tsx`, `GamesListClient`); "View all" from home no longer 404s.
- **Phase 4.1: Engine Evaluation Display (partial)** ✅
  - Live evaluation bar and real-time evaluation during game are implemented. Best move suggestion display remains optional/future.
- **Phase 4.2: AI Move Hints** ✅
  - "Get Hint" via `useHint` hook; engine best-move request; suggested move displayed and highlighted on board. Convex games schema includes optional `drawOfferedBy` for future PvP draw flow.

🔄 **Next Steps:**

- Phase 3.1: Move replay (click to navigate to position) and PGN export — in progress / planned
- Phase 3.2: Offer draw — descoped for PvE; add when PvP is supported
- **Phase 4.3: Post-game analysis** — next feature (engine review, mistakes/blunders, best moves, AI summary)

## Library Decision: react-chessboard

**Decision:** Use [`react-chessboard`](https://github.com/Clariity/react-chessboard) instead of building a custom chessboard from scratch.

**Rationale:**

- ✅ Modern, well-maintained library (492 stars, actively maintained)
- ✅ Built-in drag-and-drop functionality
- ✅ Mobile responsive out of the box
- ✅ TypeScript support
- ✅ Customizable styling
- ✅ Animation support
- ✅ Works seamlessly with `chess.js`
- ✅ Significantly reduces development time (from 4-6 hours to 2-3 hours)
- ✅ Battle-tested by 3.4k+ projects

**Integration:**

- `react-chessboard` handles all UI/UX concerns (drag-drop, animations, responsive design)
- `chess.js` handles all game logic (move validation, FEN/PGN, game state)
- Our code focuses on connecting these libraries and managing game state/persistence

## Implementation Phases

### Phase 1: Core Game Flow (MVP Foundation)

**Goal:** Enable users to create a new game and see a basic chessboard.

#### 1.1 Home/Dashboard Page Enhancement ✅ **COMPLETE**

**Location:** `apps/web/app/page.tsx`

**Tasks:**

- [x] Enhance existing home page with:
  - "New Game" button (prominent CTA) ✅
  - Active games list (if user has games in progress) ✅
  - Recent games preview (last 3-5 games) ✅
  - Navigation to game history ✅
- [x] Add loading states ✅ (handled by Next.js server components)
- [x] Add empty states (no games yet) ✅
- [x] Style with ShadCN components ✅

**Dependencies:** None

**Estimated Time:** 2-3 hours

**Status:** ✅ Complete - All tasks implemented. Home page displays active games, recent games, and includes navigation to create new games and view game history.

---

#### 1.2 New Game Creation Flow ✅ **COMPLETE**

**Location:** `apps/web/app/game/new/page.tsx`

**Status:** ✅ **Complete** - Page and API endpoint implemented.

**Tasks:**

- [x] Create new game setup page/modal with:
  - **Difficulty selector:** ✅
    - Easy (Engine depth: 5-8)
    - Medium (Engine depth: 10-12)
    - Hard (Engine depth: 15+)
  - **Color selector:** ✅
    - Play as White
    - Play as Black
    - Random (default)
  - **Start Game** button ✅
- [x] Create API endpoint: `POST /api/games` ✅
  - Validate user session ✅
  - Create game record in database ✅
  - Initialize with starting FEN position ✅
  - Return game ID ✅
- [x] Handle game creation: ✅
  - Show loading state ✅
  - Redirect to `/game/[gameId]` on success ✅
  - Handle errors gracefully ✅

**Dependencies:** Database schema (already exists)

**Estimated Time:** 3-4 hours

**Status:** ✅ Complete - New game page with difficulty and color selectors, POST API endpoint for game creation, form validation with Zod, error handling, and redirect to game page on success. Note: Difficulty and color preferences are accepted but not yet stored in database (will be used when implementing engine in Phase 2).

---

#### 1.3 Game Page Route ✅ **COMPLETE**

**Location:** `apps/web/app/game/[gameId]/page.tsx`

**Status:** ✅ **Complete** - Dynamic route implemented with server-side authentication, game data fetching, and full page layout.

**Tasks:**

- [x] Create dynamic route for game page ✅
- [x] Fetch game data from database ✅
- [x] Handle game not found / unauthorized access ✅
- [x] Set up page layout: ✅
  - Chessboard (main area) ✅
  - Move history sidebar ✅
  - Game info panel (status, turn, etc.) ✅
  - Game controls (Resign, etc.) ✅

**Dependencies:** 1.2 (game creation)

**Estimated Time:** 2-3 hours

**Status:** ✅ Complete - Game page route created with server-side authentication checks, Convex for data fetching and real-time updates, and full layout with chessboard, game info, controls, and move history. Client component wrapper (`GamePageClient`) handles all interactive features with Convex subscriptions.

---

#### 1.4 Basic Chessboard Component ✅ **COMPLETE**

**Location:** `apps/web/components/chess/chessboard.tsx`

**Library:** Use [`react-chessboard`](https://github.com/Clariity/react-chessboard) - A modern, responsive chessboard component for React

**Documentation:**

- [Getting Started Guide](https://react-chessboard.vercel.app/?path=/docs/get-started--docs)
- [Advanced Examples](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs) (includes Stockfish WASM integration)

**Status:** ✅ **Complete** - Chessboard component fully implemented with react-chessboard and chess.js integration.

**Tasks:**

- [x] Install `react-chessboard` and `chess.js` ✅

  ```bash
  pnpm add react-chessboard chess.js
  ```

- [x] Create chessboard wrapper component: ✅
  - Integrate `react-chessboard` component ✅
  - Pass FEN position from game state ✅
  - Configure board options (styling, coordinates, etc.) ✅
  - Handle piece drop events (for move attempts) ✅
- [x] Basic setup: ✅
  - Display board with starting position ✅
  - Enable drag and drop (built-in) ✅
  - Show board coordinates (built-in option) ✅
  - Responsive design (built-in) ✅
- [x] Integration with chess.js: ✅
  - Use chess.js to validate moves ✅
  - Update board position from FEN ✅
  - Handle move callbacks ✅

**Dependencies:** None (can be built in parallel)

**Estimated Time:** 2-3 hours (significantly reduced with library)

**Status:** ✅ Complete - `ChessboardWrapper` component created with full react-chessboard integration, chess.js for move validation, FEN position management, and proper error handling. Component is responsive and styled with custom colors.

**Technical Notes:**

- `react-chessboard` provides:
  - Drag and drop out of the box
  - Custom styling support
  - Mobile responsiveness
  - Animation support
  - TypeScript support
  - Legal move highlighting
- Integrate with `chess.js` for:
  - Move validation
  - FEN position management
  - Legal move generation
  - Game state management
- Example integration pattern:

  ```tsx
  import { Chessboard } from "react-chessboard";
  import { Chess } from "chess.js";

  const chess = new Chess(fen);

  function onPieceDrop(sourceSquare, targetSquare) {
    const move = chess.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to queen for simplicity
    });

    if (move === null) return false; // illegal move
    return true; // legal move
  }
  ```

---

### Phase 2: Game Mechanics

**Goal:** Enable actual chess gameplay with move validation and engine integration.

#### 2.1 Move Validation & Execution ✅ **COMPLETE**

**Location:**

- `apps/web/components/chess/game-chessboard.tsx` (UI)
- `apps/web/convex/games.ts` (Convex mutation `makeMove`)
- `apps/web/lib/services/engine.service.ts` (engine move validation, client-side)

**Status:** ✅ **Complete** - Full move validation and execution implemented with Convex mutations, real-time persistence, and optimistic updates.

**Tasks:**

- [x] Install and integrate `chess.js`: ✅
  - Add to `packages/chess` or use directly ✅
  - Create game instance from FEN ✅
  - Validate moves ✅
  - Generate legal moves for a square ✅
- [x] Implement move validation: ✅
  - Check if move is legal ✅
  - Handle special moves (castling, en passant, promotion) ✅
  - Prevent illegal moves ✅
- [x] Update chessboard component (using react-chessboard): ✅
  - Use `onPieceDrop` callback for move validation ✅
  - Use `position` prop to update board from FEN ✅
  - Optimistic updates for instant visual feedback ✅
- [x] Create move API endpoint: ✅
  - `makeMove` Convex mutation ✅
  - Validate move in Convex mutation ✅
  - Save move in Convex ✅
  - Update game FEN and PGN ✅
  - Real-time updates via Convex subscriptions ✅
- [x] Handle move errors: ✅
  - Show error messages for invalid moves ✅
  - Handle network errors ✅
  - Optimistic updates with rollback ✅

**Dependencies:** 1.4 (chessboard component)

**Estimated Time:** 4-5 hours (reduced with react-chessboard handling UI)

**Status:** ✅ Complete - Full move validation implemented on both client and server. Moves are validated using chess.js, stored in Convex with full metadata (SAN, UCI, FEN before/after), and game state is updated in real time. Game end detection (checkmate, stalemate, draw) is implemented. Optimistic updates provide instant visual feedback.

---

#### 2.2 Game State Management ✅ **COMPLETE**

**Location:**

- `apps/web/app/game/[gameId]/page.tsx`
- `apps/web/lib/hooks/use-game.ts` (custom hook)
- `apps/web/components/game/game-page-client.tsx` (client component)

**Status:** ✅ **Complete** - Comprehensive game state management with real-time updates, turn indicators, and game status display.

**Tasks:**

- [x] Create game state hook: ✅
  - Fetch game data ✅
  - Manage current position (FEN) ✅
  - Track move history ✅
  - Handle turn indicator ✅
  - Game status (in_progress, completed, etc.) ✅
- [x] Implement real-time updates: ✅
  - Polling for engine moves (MVP approach) ✅
  - Real-time updates via Convex subscriptions ✅
- [x] Update UI based on game state: ✅
  - Show whose turn it is ✅
  - Display game status ✅
  - Disable moves when not user's turn ✅
  - Show check/checkmate indicators ✅

**Dependencies:** 2.1 (move validation)

**Estimated Time:** 4-5 hours

**Status:** ✅ Complete - `useGame` hook created for centralized game state management. Real-time updates via Convex subscriptions. Turn indicator, check/checkmate/stalemate/draw indicators implemented. Move history displayed with proper formatting. Client component (`GamePageClient`) handles all interactive features with automatic UI updates.

---

#### 2.3 Stockfish Engine Integration ✅ **COMPLETE** (client-side only)

**Location:**

- `apps/web/lib/hooks/use-stockfish.ts` (client-side engine hook)
- `apps/web/public/engine/stockfish.js` (Stockfish Web Worker)
- `apps/web/components/game/game-page-client.tsx` (engine turn effect, submit via `makeMove`)

**Status:** ✅ **Complete** - Engine runs client-side only. Stockfish is initialized in the browser via Web Worker; when it is the engine's turn, the client computes the best move and submits it via the Convex `makeMove` mutation. No server-side engine API. Difficulty is applied via depth in `@repo/chess` (`getEngineDepth`).

**Tasks:**

- [x] Client-side engine: `useStockfish` hook, Stockfish from `/public/engine/`
- [x] Auto-play engine moves when it is engine's turn; submit via `makeMove`
- [x] Difficulty levels (easy/medium/hard) control engine depth
- [ ] Server-side engine API and evaluation bar / move hints (optional; deferred to Phase 4)

**Dependencies:** 2.1, 2.2

---

#### 2.4 Game Status Detection ✅ **MOSTLY COMPLETE**

**Location:**

- `apps/web/convex/games.ts` (`makeMove` updates status/result on checkmate, stalemate, draw)
- `apps/web/components/game/game-page-client.tsx` (result display, checkmate badge)

**Status:** Game end detection is implemented in `makeMove`; status and result are stored in Convex. UI shows result and checkmate badge. Game-end modal (AlertDialog with "New Game" / "View History") and king-in-check square highlight (customSquareStyles on the board) are implemented.

**Tasks:**

- [x] Game end detection (checkmate, stalemate, draw) in Convex mutation
- [x] Update game status and result in database
- [x] Display result and checkmate in UI
- [x] Game result modal and king-in-check highlight

**Dependencies:** 2.1 (move validation)

---

### Phase 3: Game Features & Polish

**Goal:** Add essential game features and improve UX.

#### 3.1 Move History & Notation (replay and PGN)

**Location:**

- `apps/web/components/game/game-page-client.tsx` (move list, replay state, PGN section)
- `apps/web/app/game/[gameId]/page.tsx`

**Tasks:**

- [ ] Move history with replay:
  - Display moves in algebraic notation (e.g., "1. e4 e5"); show move numbers
  - Highlight current move (position being viewed)
  - Click move row to navigate to position (replay)
- [ ] Move navigation controls:
  - Start / Prev / Next / End buttons; disable at boundaries
- [ ] PGN display and copy:
  - Read-only PGN block (from `game.pgn`); Copy PGN button with feedback

**Dependencies:** 2.1 (moves are being saved)

**Estimated Time:** 3-4 hours

---

#### 3.2 Game Controls ✅ **RESIGN COMPLETE**

**Location:**

- `apps/web/convex/games.ts` (`resign` mutation)
- `apps/web/components/game/game-page-client.tsx` (Resign button with confirmation)

**Status:** Resign is implemented. Offer draw is descoped for PvE and will be added when PvP is supported.

**Tasks:**

- [x] Resign: Convex mutation, button, confirmation
- [ ] Offer draw: descoped for PvE; add mutations + UI when PvP is available
- [x] New game link (to `/game/new`) available from home and game page

**Dependencies:** 2.4 (game status)

---

#### 3.3 Game History Page ✅ **COMPLETE** (list); replay optional

**Location:**

- `apps/web/app/games/page.tsx` (server component, auth)
- `apps/web/components/game/games-list-client.tsx` (Convex `api.games.list`, cards)
- Game detail: existing `/game/[gameId]` page (no separate replay page)

**Status:** Games list page at `/games` is implemented; "View all" from home links here. Shows all user games (limit 100) with status/result badges and link to each game. Game detail and move list are on the existing game page. Replay (step through moves) and PGN export are optional future work.

**Tasks:**

- [x] Games list page at `/games` with Convex list query
- [x] Display games with status, result, date; link to game page
- [ ] Replay (step through moves) and PGN export (optional)
- [ ] Pagination if needed (currently limit 100)

**Dependencies:** Phase 1 & 2 (games exist)

---

### Phase 4: Enhanced Features (Post-MVP)

**Goal:** Add advanced features for better user experience.

#### 4.1 Engine Evaluation Display ✅ **PARTIAL**

**Tasks:**

- [x] Position evaluation bar
- [x] Real-time evaluation during game
- [ ] Best move suggestion display (optional; later)

**Estimated Time:** 3-4 hours

---

#### 4.2 AI Move Hints ✅ **COMPLETE**

**Location:**

- `apps/web/lib/hooks/use-hint.ts` (hint request from Stockfish)
- `apps/web/lib/chess-notation.ts` (notation helpers)
- `apps/web/components/chess/game-chessboard.tsx`, `game-page-client.tsx` (hint UI and board highlight)

**Status:** ✅ **Complete** - "Get Hint" requests best move from engine; suggested move is displayed and highlighted on the board.

**Tasks:**

- [x] "Get Hint" button
- [x] Request hint from engine
- [x] Display suggested move
- [x] Highlight hint on board

**Estimated Time:** 2-3 hours

---

#### 4.3 Post-Game Analysis

**Tasks:**

- [ ] Engine review of completed game
- [ ] Highlight mistakes/blunders
- [ ] Show best moves at key positions
- [ ] AI-generated game summary

**Estimated Time:** 6-8 hours

---

## Technical Implementation Details

### Key Libraries & Tools

- **react-chessboard**: Modern chessboard component with drag-and-drop, animations, and mobile support
  - [GitHub Repository](https://github.com/Clariity/react-chessboard)
  - [Getting Started Docs](https://react-chessboard.vercel.app/?path=/docs/get-started--docs)
  - [Advanced Examples](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs) (includes Stockfish WASM integration)
- **chess.js**: Chess game logic, move validation, FEN/PGN handling
- **stockfish.wasm**: Chess engine (WebAssembly version) - Hybrid Approach
  - [GitHub Repository](https://github.com/lichess-org/stockfish.wasm)
  - **Client-side**: Quick evaluations (depth 5-8) for real-time UI feedback
  - **Server-side**: Engine moves and deep analysis (depth 10-20+) with controlled difficulty
  - Better performance than JavaScript-only implementations
  - Runs efficiently in both browser and Node.js
- **React**: UI framework
- **ShadCN UI**: Component library
- **Tailwind CSS**: Styling
- **Convex**: Persistence and real-time (games, moves, auth)
- **Next.js App Router**: Routing and API routes

### Database Operations

**Game Creation:**

```typescript
// Create game with initial FEN
const game = await db.insert(games).values({
  userId: session.user.id,
  status: "in_progress",
  fen: INITIAL_FEN,
});
```

**Move Saving:**

```typescript
// Save move after validation
await db.insert(moves).values({
  gameId: game.id,
  moveNumber: moveNumber,
  moveSan: move.san,
  moveUci: move.uci,
  fenBefore: fenBefore,
  fenAfter: fenAfter,
  evaluation: engineEvaluation,
});
```

### API (Convex queries and mutations)

1. `api.games.create` - Create new game ✅ **Implemented**
2. `api.games.list` - List user's games ✅ **Implemented**
3. `api.games.getById` - Get game details ✅ **Implemented**
4. `api.games.getMoves` - Get moves for a game ✅ **Implemented**
5. `api.games.makeMove` - Make a move ✅ **Implemented**
6. Engine move - Handled client-side (Stockfish) then submitted via `makeMove` ✅
7. `api.games.resign` - Resign game ✅ **Implemented**
8. `games.offerDraw` - Offer draw (descoped for PvE; add with PvP)
9. `games.acceptDraw` / `declineDraw` - (descoped for PvE; add with PvP)

### State Management Strategy

**Client-Side:**

- React state for UI state (selected square, move history display)
- Convex `useQuery` for game and move data (real-time subscriptions)
- Optimistic updates for moves; Convex reactivity for persistence
- Client-side Stockfish WASM for real-time evaluation (evaluation bar, move hints)
- Local caching of engine evaluations

**Server-Side:**

- Database as source of truth
- Server-side Stockfish WASM for engine moves (controlled difficulty, rate limiting)
- Real-time updates via Convex subscriptions

## User Journey Flow

```text
1. User logs in
   ↓
2. Home page shows "New Game" button
   ↓
3. User clicks "New Game"
   ↓
4. Select difficulty and color
   ↓
5. Game created → Redirect to /game/[gameId]
   ↓
6. Chessboard loads with starting position
   ↓
7. User makes move → Validated → Saved → Board updates
   ↓
8. Engine calculates move → Move executed → Board updates
   ↓
9. Repeat steps 7-8 until game ends
   ↓
10. Game end detected → Result displayed
   ↓
11. User can review game or start new game
```

## Success Criteria

Phase 1 is complete when:

- ✅ User can create a new game
- ✅ User can see a chessboard with pieces
- ✅ Basic UI is functional

**Status:** ✅ **Phase 1 Complete** - All core game flow implemented.

Phase 2 is complete when:

- ✅ User can make valid moves
- ✅ Engine responds with moves (Phase 2.3 - client-side Stockfish)
- ✅ Game state is saved to database
- ✅ Game end is detected correctly

**Status:** ✅ **Phase 2 Complete** - Move validation, game state, and engine integration done.

Phase 3 is complete when:

- ✅ User can view game history (home + `/games` list)
- [x] User can replay past games (step-through; Phase 3.1)
- ✅ Core game features work (resign implemented; offer draw descoped for PvE)

## Next Steps

1. ✅ **Phase 1.1–1.4**: Home, new game, game page, chessboard - **COMPLETE**
2. ✅ **Phase 2.1–2.4**: Move validation, game state, Stockfish (client-side), game status - **COMPLETE**
3. ✅ **Phase 3.1**: Move replay and PGN export - **COMPLETE**
4. ✅ **Phase 3.2**: Resign - **COMPLETE** (offer draw descoped for PvE)
5. ✅ **Phase 3.3**: Game history page (`/games`) - **COMPLETE**
6. ✅ **Phase 4.1**: Evaluation bar and real-time eval - **COMPLETE**; best move suggestion optional
7. ✅ **Phase 4.2**: AI move hints - **COMPLETE**
8. **Next:** Phase 4.3 Post-game analysis (engine review, mistakes/blunders, best moves, AI summary)

**Current Status:** Core game mechanics, game history, move replay, and PGN export are complete. Live evaluation bar and move hints are implemented. Users can create games, play vs engine, get hints, resign, replay moves, and copy PGN. Next up: post-game analysis (Phase 4.3). Offer draw is descoped for PvE and will be added with PvP.

## Notes

- Build incrementally - get something working end-to-end first
- Test each phase before moving to the next
- Consider mobile responsiveness from the start
- Keep components modular and reusable
- Use TypeScript strictly for type safety
- Follow existing code patterns and conventions
