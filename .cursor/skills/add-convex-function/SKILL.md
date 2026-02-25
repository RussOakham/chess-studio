---
name: add-convex-function
description: Adds a new Convex query, mutation, or action following this project's patterns. Use when the user asks to add a new Convex function, endpoint, or API.
---

# Add Convex Function (Project-Specific)

Add a new Convex query, mutation, or action using the Convex plugin patterns plus this repo's conventions (requireGameAccess, validators.ts, thin handlers).

## When to use

- User asks to add a new Convex query, mutation, or action (or "new Convex endpoint").
- User asks to "add a Convex function for X."

## Steps

1. **Use Convex plugin function-creator** (or schema/validators rules) for the generic pattern (args, handler shape, auth).
2. **Project specifics:**
   - **Game/move access:** Use `requireGameAccess(ctx, gameId)` (or equivalent) from `apps/web/convex/games.ts`; do not duplicate auth logic.
   - **Return validators:** Add or reuse validators in `apps/web/convex/validators.ts`; add `returns: …` to the handler (see existing `gameValidator`, `moveValidator`, etc.).
   - **Thin handlers:** Put business logic in plain TS functions (e.g. `applyMove`, internal helpers); keep the exported handler to auth, validation, and delegation.
3. **Export** from the correct module so the function appears under `api.*` as expected (e.g. `convex/games.ts` → `api.games.getById`).
4. **If part of a Convex improvements effort:** Update `docs/temp/convex-improvements.temp.md` checklist if it exists and is relevant.
5. **Run Convex reviewer** on the new or changed file(s).

## References

- Convex rules: `@.cursor/rules/convex.mdc`
- Architecture (Convex usage): `@.cursor/rules/architecture-patterns.mdc`
- Validators and games: `@apps/web/convex/validators.ts`, `@apps/web/convex/games.ts`
- Review after changes: `@.cursor/skills/run-convex-react-review/SKILL.md`
