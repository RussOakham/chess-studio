---
name: add-convex-function
description: Adds a new Convex query, mutation, or action following this project's patterns. Use when the user asks to add a new Convex function, endpoint, or API.
---

# Add Convex Function (Project-Specific)

Add a new Convex query, mutation, or action using the Convex plugin patterns plus this repo's conventions (`authedQuery` / `ownedGameMutation` from `authed-functions.ts`, or `game-access.ts` for one-off checks, validators.ts, thin handlers).

## When to use

- User asks to add a new Convex query, mutation, or action (or "new Convex endpoint").
- User asks to "add a Convex function for X."

## Steps

1. **Use Convex plugin function-creator** (or schema/validators rules) for the generic pattern (args, handler shape, auth).
2. **Project specifics:**
   - **Auth / game access:** Prefer `authedQuery`, `authedMutation`, `ownedGameQuery`, and `ownedGameMutation` from `apps/web/convex/lib/authed-functions.ts`. For handlers that do not fit those wrappers, call `requireOwnedGame` / `getAuthedUserId` from `apps/web/convex/lib/game-access.ts` once; do not duplicate auth logic.
   - **Return validators:** Add or reuse validators in `apps/web/convex/validators.ts`; add `returns: …` to the handler (see existing `gameValidator`, `moveValidator`, etc.).
   - **Thin handlers:** Put business logic in plain TS functions (e.g. `applyMove`, internal helpers); keep the exported handler to auth, validation, and delegation.
3. **Export** from the correct module so the function appears under `api.*` as expected (e.g. `convex/games.ts` → `api.games.getById`).
4. **If the user keeps a personal checklist** for a larger effort, they can update it locally; do not reference paths to `.temp.md` files from tracked repo docs.
5. **Run Convex reviewer** on the new or changed file(s).

## References

- Convex rules: `@.cursor/rules/convex.mdc`
- Architecture (Convex usage): `@.cursor/rules/architecture-patterns.mdc`
- Validators and auth: `@apps/web/convex/validators.ts`, `@apps/web/convex/lib/authed-functions.ts`, `@apps/web/convex/lib/game-access.ts`, `@apps/web/convex/games.ts`
- Review after changes: `@.cursor/skills/run-convex-react-review/SKILL.md`
