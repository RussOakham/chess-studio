# Chess.com UX Views Reference

Reference summary of three Chess.com views to align our application’s UX during visual refactoring. Based on screenshots: Match view (post-game), Match Review (overview), and Match Review (mid-review).

---

## Architecture & behaviour

### Game review in a new tab

Chess.com opens Game Review in a **new browser tab** (e.g. from Match view, the “Game Review” button opens `/analysis/game/computer/{id}/review` in a new tab). Adopting this pattern is recommended:

- **Separation of concerns:** Match view stays the “play” context (game over, rematch, new bot); review is a dedicated analysis context with its own URL and state.
- **Navigation:** User can keep the finished game tab open and compare or return to it without losing review progress.
- **Implementation:** Use `target="_blank"` (and `rel="noopener noreferrer"`) for the Game Review link/button, or programmatic `window.open` with the review URL.

---

## Theming

### Light and dark mode

Chess.com supports both **light** and **dark** themes (the reference screenshots are dark mode). We should support both:

- **UI toggle:** Provide a theme switcher (e.g. in the nav/settings area) so users can choose light or dark.
- **Persistence:** Store the user’s choice (e.g. `localStorage` or account preference) and apply it on load.
- **Implementation:** Use CSS variables or a theme provider (e.g. Tailwind dark variant, Next.js theme script) so all key surfaces—sidebars, board area, cards, buttons—respect the active theme. Ensure contrast and the green accent for primary actions work in both modes.

---

## 1. Match View (Post-game)

**Context:** Final board state after a game ends (e.g. checkmate). URL pattern: `/game/computer/{id}`.

### Layout

- **Left sidebar:** Site navigation and user profile.
- **Center:** Chessboard and player strips above/below.
- **Right sidebar:** Game details, move list, summary stats, and actions.

### Left sidebar

- Logo at top.
- Nav: Play (active), Puzzles, Learn, More, Free Trial.
- Search.
- User block: username, avatar, flag, captured pieces, score/crown.
- Icons: community, messages, notifications, settings.

### Center: board area

- **Above board:** Opponent (name, rating, avatar, flag, captured pieces, gear).
- **Board:** 8×8, green/light-green squares, file/rank labels (a–h, 1–8).
- **Board state cues:**
  - Last-move highlight (e.g. pale yellow on destination square).
  - King in check: red circle + cross on king square.
  - Optional green “safe” highlight on own king; optional pale green on threat/target squares.
- **Below board:** Current user (avatar, username, rating delta).

### Right sidebar: game details and actions

- **Header:** “Play Bots” (or equivalent).
- **Bot message:** Avatar + speech bubble (e.g. “Great play! Do you want to coach my kids?”).
- **Opening:** Name (e.g. “Queen’s Pawn Opening”) with clipboard/clock icons.
- **Move list:** Scrollable, two-column (White | Black), piece icons, algebraic notation; final move (e.g. `63. xh5#`) visually emphasized.
- **Summary stats:** Three buckets with counts and icons, e.g.:
  - “3 Great”
  - “16 Best”
  - “10 Excellent”
- **Primary CTA:** Large green “Game Review” button with star icon.
- **Secondary:** “+ New Bot”, “Rematch” (grey).
- **Utility row:** Share, download, settings, step-through arrows (`< >`).

### Visual style

- Dark theme (as shown): dark grey sidebars, lighter content areas, white/light text. Light theme should be supported via theme toggle (see Theming above).
- Green for primary actions and positive emphasis.
- Clear hierarchy: primary (green) vs secondary (grey) buttons.

---

## 2. Match Review (Overview)

**Context:** Game Review landing after a game; typically opened in a **new tab** from Match view. URL pattern: `/analysis/game/computer/{id}/review`. Focus on accuracy and move-quality summary before stepping through moves.

### Layout

- Same three-column structure: left nav, center board, right review panel.

### Left sidebar

- Same as Match view (logo, Play/Puzzles/Learn/More, Free Trial, search, user, icons).

### Center: board

- Board in starting position (or initial position for the review).
- Player labels above/below (opponent above, user below).
- Optional vertical scrollbar for move/event list.

### Right panel: Game Review overview

- **Header:** Gear, “Game Review”, speaker, search.
- **Coach block:** Avatar + speech bubble (e.g. “After you won a piece in the opening, the game was yours. Let’s take a look.”).
- **Accuracy graph:** Horizontal chart of accuracy over time; segments/lines by phase or quality (e.g. green/red); dots for moves.
- **Player comparison:**
  - Two columns: user vs opponent (avatar, name).
  - **Accuracy:** Prominent percentage (e.g. 59.7% vs 52.9%); leading side can have green highlight.
  - **Move quality breakdown (each player):**
    - Brilliant (blue).
    - Great (green).
    - Best (green).
    - Mistake (orange).
    - Miss (red).
    - Blunder (red).
  - Expandable section (chevron) for more detail.
- **Game rating:** Two numbers (e.g. 500 vs 100).
- **Primary CTA:** Large green “Start Review” button.

### Visual style

- Same dark/light theme support as Match view; green for primary actions and positive metrics.
- Color-coded move quality (green = good, orange = mistake, red = miss/blunder).

---

## 3. Match Review (Mid-review)

**Context:** Same Game Review URL with `?move=2` (or similar). User is stepping through the game; review panel shows analysis for the current move.

### Layout

- Same three columns; board shows position at selected move.

### Left sidebar

- Unchanged from other views.

### Center: board

- Position at current move (e.g. after 2. Bf4).
- **Move feedback on board:** Subtle highlight on the piece that just moved (e.g. bishop on f4) and optional play/pause-style indicator on that square.
- Player strips above/below (opponent above, user below).

### Right panel: move-by-move analysis

- **Header:** Gear, “Game Review”, rocket/share, search.
- **Current-move card (white card):**
  - **Move and evaluation:** e.g. “f4 is the last book move” with score “+0.20”.
  - **Explanation:** e.g. “That’s how you develop the bishop while eyeing the center.”
  - **Coach avatar** beside the text.
  - **Opening context:** e.g. “Queen’s Pawn Opening” + “Played 5 times as White. 80% win rate.”
  - **Primary CTA:** Green “Next” button with arrow.
- **Move list:** Scrollable, two columns; move numbers with White/Black moves.
  - **Annotations:** Icons for quality (e.g. ??, ?, !, ?!) and colored dots (green/orange/red) per move.
- **Evaluation graph:** Horizontal bar/chart over time; dots per move; spikes/dips for advantage.
- **Playback controls:** Rewind to start | Previous | Play | Next | Forward to end.

### Visual style

- Same dark/light theme support; white card for the current move to create focus (adjust card background for dark mode).
- Green for “Next” and positive cues; graph and dots for evaluation and move quality.

---

## Summary: Patterns to align with

| Area                       | Patterns                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Layout**                 | Three columns: nav (left), board (center), game/review panel (right).                             |
| **Theme**                  | Dark grey backgrounds, white/light text, green for primary actions and positive metrics.          |
| **Board**                  | Green board squares, file/rank labels, last-move and check/checkmate highlights.                  |
| **Player info**            | Above/below board: name, avatar, flag, rating; optional captured pieces.                          |
| **Move list**              | Two-column, piece icons, algebraic notation, quality icons/dots, scrollable.                      |
| **Primary actions**        | Single prominent green button per view (Game Review, Start Review, Next).                         |
| **Secondary actions**      | Grey buttons (New Bot, Rematch, etc.).                                                            |
| **Review**                 | Coach avatar + speech bubble, accuracy/stats, evaluation graph, step-through controls.            |
| **Move quality**           | Consistent palette: green (good), orange (mistake), red (miss/blunder), blue (brilliant).         |
| **Game review navigation** | Open Game Review in a new tab for separation of concerns (match vs analysis).                     |
| **Theming**                | Support light and dark mode via a UI toggle; persist choice; ensure accents and contrast in both. |

Use this document as the UX reference when refactoring our match view, post-game entry, and game review flows to better match Chess.com’s structure and visual language.
