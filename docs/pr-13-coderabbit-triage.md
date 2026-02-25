# PR #13 – CodeRabbit review triage

## Critical / Important (fix before merge)

| #   | File                    | Issue                                                                           | Action                                                                                                     |
| --- | ----------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | `move-history-card.tsx` | Empty black-move cell is still clickable and can set replay index out of bounds | **Fix:** Guard `onClick` when `!blackMove`, add `disabled={!blackMove}` so the "—" cell is non-interactive |

---

## Medium (fix when reasonable)

| #   | File                     | Issue                                                                                                   | Action                                                                                                                                      |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 2   | `review-page-client.tsx` | `moveQualityCounts`: `brilliant` and `best` both filter `"best"`; `miss` hardcoded 0; unused/misleading | **Fix:** Remove `brilliant` and `miss` from return object (callers only use great, best, mistake, blunder)                                  |
| 3   | `game-page-client.tsx`   | `replace("_", " ")` only replaces first underscore                                                      | **Fix:** Use `replaceAll("_", " ")` for status and result                                                                                   |
| 4   | `game-page-client.tsx`   | Game Review: `<Button>` inside `<a>` → invalid HTML                                                     | **Fix:** Use `<a>` with `buttonVariants({ size: "lg" })` so the link is the interactive element (Button has no `asChild` in this codebase). |
| 5   | `app-shell.tsx`          | Nav links: `<Button>` inside `<Link>` → invalid HTML                                                    | **Fix:** Use `<Link className={buttonVariants(...)}>` so the link is the interactive element.                                               |
| 6   | `app/(main)/page.tsx`    | New Game: `<Button>` inside `<Link>` → invalid HTML                                                     | **Fix:** Use `<Link className={buttonVariants({ size: "lg" })}>` so the link is the interactive element.                                    |

---

## Low (optional / style)

| #   | File                                   | Issue                                              | Action                                                     |
| --- | -------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| 7   | `theme-toggle.tsx`                     | Moon icon `absolute` with no `relative` on trigger | **Fix:** Add `relative` to `DropdownMenuTrigger` className |
| 8   | `docs/ux/chess-com-views-reference.md` | "We should support both" → use imperative          | **Fix:** "Support both:" and keep bullets imperative       |

---

## No action / Defer

| Item                                                        | Reason                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Docstring coverage 5% vs 80%                                | Pre-merge check; project may not enforce; docstrings can be added in a follow-up |
| Extract `MoveRow` component (move-history-card)             | Refactor for readability; optional, can defer                                    |
| `useBoardSize` hook (DRY game + review)                     | Nice-to-have DRY; can defer                                                      |
| Runtime type guard for `review.moveAnnotations`             | Defensive; Convex types are trusted; can defer                                   |
| Hoist IIFE to `useMemo` for review stats (game-page-client) | Minor perf; can defer                                                            |

---

## Summary

- **Address:** 1 Critical, 5 Medium, 2 Low (all straightforward).
- **Defer:** 4 nitpicks (extract component, hook, type guard, useMemo).
