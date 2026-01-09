# Game Implementation Plan

## Overview

This document outlines the high-level implementation plan for building the core chess game functionality. The plan is organized into phases that build upon each other, starting with the essential user journey and progressing to full game mechanics.

## Current Status

✅ **Completed:**

- Project setup and configuration
- Authentication system (login/register)
- Database schema (games, moves, gameReviews tables)
- Basic chess utilities package
- Code quality tooling (ESLint, Prettier)

🔄 **Next Steps:**

- Core game flow implementation
- Chessboard UI component (using `react-chessboard` library)
- Game mechanics and engine integration

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

#### 1.1 Home/Dashboard Page Enhancement

**Location:** `apps/web/app/page.tsx`

**Tasks:**

- [ ] Enhance existing home page with:
  - "New Game" button (prominent CTA)
  - Active games list (if user has games in progress)
  - Recent games preview (last 3-5 games)
  - Navigation to game history
- [ ] Add loading states
- [ ] Add empty states (no games yet)
- [ ] Style with ShadCN components

**Dependencies:** None

**Estimated Time:** 2-3 hours

---

#### 1.2 New Game Creation Flow

**Location:** `apps/web/app/game/new/page.tsx` (or modal component)

**Tasks:**

- [ ] Create new game setup page/modal with:
  - **Difficulty selector:**
    - Easy (Engine depth: 5-8)
    - Medium (Engine depth: 10-12)
    - Hard (Engine depth: 15+)
  - **Color selector:**
    - Play as White
    - Play as Black
    - Random (default)
  - **Start Game** button
- [ ] Create API endpoint: `POST /api/games`
  - Validate user session
  - Create game record in database
  - Initialize with starting FEN position
  - Return game ID
- [ ] Handle game creation:
  - Show loading state
  - Redirect to `/game/[gameId]` on success
  - Handle errors gracefully

**Dependencies:** Database schema (already exists)

**Estimated Time:** 3-4 hours

---

#### 1.3 Game Page Route

**Location:** `apps/web/app/game/[gameId]/page.tsx`

**Tasks:**

- [ ] Create dynamic route for game page
- [ ] Fetch game data from database
- [ ] Handle game not found / unauthorized access
- [ ] Set up page layout:
  - Chessboard (main area)
  - Move history sidebar
  - Game info panel (status, turn, etc.)
  - Game controls (Resign, etc.)

**Dependencies:** 1.2 (game creation)

**Estimated Time:** 2-3 hours

---

#### 1.4 Basic Chessboard Component

**Location:** `apps/web/components/chess/chessboard.tsx`

**Library:** Use [`react-chessboard`](https://github.com/Clariity/react-chessboard) - A modern, responsive chessboard component for React

**Documentation:**

- [Getting Started Guide](https://react-chessboard.vercel.app/?path=/docs/get-started--docs)
- [Advanced Examples](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs) (includes Stockfish WASM integration)

**Tasks:**

- [ ] Install `react-chessboard` and `chess.js`:

  ```bash
  pnpm add react-chessboard chess.js
  ```

- [ ] Create chessboard wrapper component:
  - Integrate `react-chessboard` component
  - Pass FEN position from game state
  - Configure board options (styling, coordinates, etc.)
  - Handle piece drop events (for move attempts)
- [ ] Basic setup:
  - Display board with starting position
  - Enable drag and drop (built-in)
  - Show board coordinates (built-in option)
  - Responsive design (built-in)
- [ ] Integration with chess.js:
  - Use chess.js to validate moves
  - Update board position from FEN
  - Handle move callbacks

**Dependencies:** None (can be built in parallel)

**Estimated Time:** 2-3 hours (significantly reduced with library)

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

#### 2.1 Move Validation & Execution

**Location:**

- `apps/web/components/chess/chessboard.tsx` (UI)
- `apps/web/app/api/games/[gameId]/moves/route.ts` (API)

**Tasks:**

- [ ] Install and integrate `chess.js`:
  - Add to `packages/chess` or use directly
  - Create game instance from FEN
  - Validate moves
  - Generate legal moves for a square
- [ ] Implement move validation:
  - Check if move is legal
  - Handle special moves (castling, en passant, promotion)
  - Prevent illegal moves
- [ ] Update chessboard component (using react-chessboard):
  - Use `customSquareStyles` prop to highlight legal moves
  - Use `onPieceDrop` callback for move validation
  - Use `position` prop to update board from FEN
  - Use `areArrowsAllowed` and `onArrowsChange` for move hints (optional)
- [ ] Create move API endpoint:
  - `POST /api/games/[gameId]/moves`
  - Validate move server-side
  - Save move to database
  - Update game FEN and PGN
  - Return updated game state
- [ ] Handle move errors:
  - Show error messages for invalid moves
  - Handle network errors
  - Optimistic updates with rollback

**Dependencies:** 1.4 (chessboard component)

**Estimated Time:** 4-5 hours (reduced with react-chessboard handling UI)

---

#### 2.2 Game State Management

**Location:**

- `apps/web/app/game/[gameId]/page.tsx`
- `apps/web/lib/hooks/use-game.ts` (custom hook)

**Tasks:**

- [ ] Create game state hook:
  - Fetch game data
  - Manage current position (FEN)
  - Track move history
  - Handle turn indicator
  - Game status (in_progress, completed, etc.)
- [ ] Implement real-time updates:
  - Polling for engine moves (MVP approach)
  - Or WebSocket connection (future enhancement)
- [ ] Update UI based on game state:
  - Show whose turn it is
  - Display game status
  - Disable moves when not user's turn
  - Show check/checkmate indicators

**Dependencies:** 2.1 (move validation)

**Estimated Time:** 4-5 hours

---

#### 2.3 Stockfish Engine Integration (Hybrid Approach)

**Location:**

- `apps/web/components/chess/engine-client.tsx` (client-side engine)
- `apps/web/app/api/games/[gameId]/engine/route.ts` (server-side API endpoint)
- `packages/chess/src/engine.ts` (shared engine utilities)

**Library:** Use [`stockfish.wasm`](https://github.com/lichess-org/stockfish.wasm) - WebAssembly port of Stockfish

**Why WASM?**

- Runs efficiently in both browser and Node.js
- Better performance than JavaScript-only implementations
- Lower memory footprint
- Works seamlessly with `react-chessboard` (see [advanced examples](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs))

**Hybrid Architecture:**

- **Client-Side (Browser)**: Quick evaluations (depth 5-8) for real-time UI feedback
  - Position evaluation bar
  - Legal move highlighting
  - Move hints (shallow analysis)
  - Instant feedback, no network latency
- **Server-Side (API)**: Engine moves and deep analysis (depth 10-20+)
  - Controlled difficulty levels
  - Rate limiting and cost control
  - Consistent performance
  - Integration with AI services

**Tasks:**

- [ ] Install `stockfish.wasm`:

  ```bash
  pnpm add stockfish.wasm
  ```

- [ ] **Client-Side Engine Setup:**
  - Create `engine-client.tsx` hook/component
  - Initialize Stockfish WASM in browser
  - Implement quick evaluation (depth 5-8)
  - Integrate with react-chessboard for evaluation display
  - Add legal move highlighting using engine
  - Cache evaluations for common positions
- [ ] **Server-Side Engine API:**
  - Implement `POST /api/games/[gameId]/engine/move` endpoint
  - Accept current FEN position and difficulty level
  - Initialize Stockfish WASM in Node.js
  - Calculate best move (depth 10-20+ based on difficulty)
  - Return move in UCI format
  - Add rate limiting
- [ ] **Engine Configuration:**
  - Difficulty levels mapping:
    - Easy: depth 10-12
    - Medium: depth 15-18
    - Hard: depth 20+
  - Thinking time limits
  - Evaluation return
- [ ] **Auto-play Engine Moves:**
  - Trigger after user move
  - Show loading state while engine thinks
  - Call server-side API for engine move
  - Execute engine move automatically
  - Update game state
- [ ] **Integration with react-chessboard:**
  - Follow [advanced examples guide](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs)
  - Use client-side engine for real-time evaluation
  - Use server-side engine for actual moves

**Dependencies:** 2.1, 2.2

**Estimated Time:** 8-10 hours (includes both client and server setup)

**Technical Notes:**

- **Client-Side:**
  - Limit depth to 5-8 to avoid blocking UI thread
  - Debounce evaluation requests during rapid moves
  - Cache engine instances and evaluations
  - Use Web Workers if needed for heavy calculations
- **Server-Side:**
  - Use deeper analysis (10-20+ depth) for actual moves
  - Implement rate limiting to prevent abuse
  - Cache engine instances per request or use connection pooling
  - Handle engine timeouts gracefully
- **Best Practices:**
  - Client-side for UX (evaluation bar, hints)
  - Server-side for game logic (engine moves, difficulty control)
  - See react-chessboard [advanced examples](https://react-chessboard.vercel.app/?path=/docs/how-to-use-advanced-examples--docs) for integration patterns

---

#### 2.4 Game Status Detection

**Location:**

- `packages/chess/src/game-state.ts` (utilities)
- `apps/web/app/game/[gameId]/page.tsx` (UI)

**Tasks:**

- [ ] Implement game end detection:
  - Checkmate detection
  - Stalemate detection
  - Draw detection (insufficient material, threefold repetition, 50-move rule)
- [ ] Update game status in database:
  - Set status to "completed"
  - Set result (white_wins, black_wins, draw)
  - Update game record
- [ ] Display game end UI:
  - Show game result modal/alert
  - Display reason (checkmate, stalemate, draw)
  - Options: New Game, Review Game, View History
- [ ] Handle check indicator:
  - Highlight king in check
  - Show check warning

**Dependencies:** 2.1 (move validation)

**Estimated Time:** 3-4 hours

---

### Phase 3: Game Features & Polish

**Goal:** Add essential game features and improve UX.

#### 3.1 Move History & Notation

**Location:**

- `apps/web/components/chess/move-history.tsx`
- `apps/web/app/game/[gameId]/page.tsx`

**Tasks:**

- [ ] Create move history component:
  - Display moves in algebraic notation (e.g., "1. e4 e5")
  - Show move numbers
  - Highlight current move
  - Click to navigate to position (replay)
- [ ] Add move navigation:
  - Previous/Next buttons
  - Jump to start/end
  - Click move in history to view position
- [ ] Display PGN notation:
  - Full game notation
  - Copy PGN button
  - Export game option

**Dependencies:** 2.1 (moves are being saved)

**Estimated Time:** 3-4 hours

---

#### 3.2 Game Controls

**Location:**

- `apps/web/components/chess/game-controls.tsx`
- `apps/web/app/api/games/[gameId]/resign/route.ts`

**Tasks:**

- [ ] Implement resign functionality:
  - Resign button
  - Confirmation dialog
  - API endpoint to update game status
  - Show resignation in game result
- [ ] Add draw offer (optional for MVP):
  - Offer draw button
  - Handle draw acceptance
- [ ] Game controls UI:
  - Resign button
  - Draw offer button
  - New game button (redirects to new game page)

**Dependencies:** 2.4 (game status)

**Estimated Time:** 2-3 hours

---

#### 3.3 Game History Page

**Location:**

- `apps/web/app/games/page.tsx`
- `apps/web/app/games/[gameId]/page.tsx` (game detail/replay)

**Tasks:**

- [ ] Create games list page:
  - Fetch user's games from database
  - Display in table/list format
  - Show: Date, Opponent, Result, Status
  - Filter by status (all, completed, in progress)
  - Sort by date (newest first)
- [ ] Create game detail/replay page:
  - Display full game information
  - Replay functionality (step through moves)
  - Move list with annotations
  - Game metadata (duration, result, etc.)
- [ ] Add pagination:
  - Load more games
  - Infinite scroll or pagination controls

**Dependencies:** Phase 1 & 2 (games exist)

**Estimated Time:** 4-5 hours

---

### Phase 4: Enhanced Features (Post-MVP)

**Goal:** Add advanced features for better user experience.

#### 4.1 Engine Evaluation Display

**Tasks:**

- [ ] Position evaluation bar
- [ ] Real-time evaluation during game
- [ ] Best move suggestion display

**Estimated Time:** 3-4 hours

---

#### 4.2 AI Move Hints

**Tasks:**

- [ ] "Get Hint" button
- [ ] Request hint from engine
- [ ] Display suggested move
- [ ] Highlight hint on board

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
- **Drizzle ORM**: Database operations
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

### API Endpoints Needed

1. `POST /api/games` - Create new game
2. `GET /api/games` - List user's games
3. `GET /api/games/[gameId]` - Get game details
4. `POST /api/games/[gameId]/moves` - Make a move
5. `POST /api/games/[gameId]/engine/move` - Get engine move
6. `POST /api/games/[gameId]/resign` - Resign game
7. `POST /api/games/[gameId]/draw` - Offer/accept draw

### State Management Strategy

**Client-Side:**

- React state for UI state (selected square, move history display)
- React Query or SWR for server state (game data, moves)
- Optimistic updates for moves
- Client-side Stockfish WASM for real-time evaluation (evaluation bar, move hints)
- Local caching of engine evaluations

**Server-Side:**

- Database as source of truth
- Server-side Stockfish WASM for engine moves (controlled difficulty, rate limiting)
- Real-time updates via polling (MVP) or WebSocket (future)

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

Phase 2 is complete when:

- ✅ User can make valid moves
- ✅ Engine responds with moves
- ✅ Game state is saved to database
- ✅ Game end is detected correctly

Phase 3 is complete when:

- ✅ User can view game history
- ✅ User can replay past games
- ✅ All MVP game features work

## Next Steps

1. **Start with Phase 1.1**: Enhance home page with "New Game" button
2. **Then Phase 1.2**: Create new game flow
3. **Then Phase 1.4**: Build basic chessboard component
4. **Then Phase 1.3**: Create game page to tie it together

This creates a complete user journey early, even if moves aren't validated yet.

## Notes

- Build incrementally - get something working end-to-end first
- Test each phase before moving to the next
- Consider mobile responsiveness from the start
- Keep components modular and reusable
- Use TypeScript strictly for type safety
- Follow existing code patterns and conventions
