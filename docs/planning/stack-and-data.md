# Stack, data, auth, and AI env (canonical)

This is the canonical “how the app is built” reference: the runtime pieces, where data lives, how auth works, and how AI/engine features are wired.

If you’re looking for roadmaps/PRDs instead, start from `docs/README.md`.

## Runtime pieces (where things run)

- **Web app**: Next.js (`apps/web`) on **Vercel** (App Router).
- **Backend + database**: **Convex** (schema + queries/mutations/actions) on **Convex Cloud**.
- **Chess engine**: **Stockfish in the browser** (Web Worker) for evaluation, hints, and analysis.

There is **no** separate SQL database (no Postgres) and **no** separate game API service.

## Data and persistence (Convex)

All application data lives in Convex:

- **Games and moves**: `games`, `moves` (real-time subscriptions for live play)
- **Game reviews**: `game_reviews` (engine analysis output + optional AI summary fields)
- **Auth**: Better Auth via `@convex-dev/better-auth` component (users, sessions, accounts, …)
- **Caches**: e.g. Lichess Opening Explorer cache where used

**Schema source of truth**: `apps/web/convex/schema.ts`.

## Auth (Better Auth + Convex)

- Next.js exposes the Better Auth handler under `apps/web/app/api/auth/[...all]/`.
- Convex functions that require auth should rely on the repo’s wrappers (see validation/access patterns below).

## Validation and access patterns (Convex)

Use the shared wrappers/helpers rather than re-implementing auth/ownership checks:

- `apps/web/convex/lib/authed_functions.ts` (`authedQuery`, `authedMutation`, `authedAction`, `ownedGameQuery`, `ownedGameMutation`)
- `apps/web/convex/lib/game_access.ts` (`getAuthedUserId`, `requireOwnedGame`)

See `docs/planning/convex-validation-patterns.md` for details.

## AI Gateway and environment variables (important)

The post-game **LLM summary** feature runs in **Convex “use node” actions** (server-side on Convex, not Vercel).

That means:

- Vercel env vars are **not automatically available** to Convex actions.
- If you want AI summaries, set **`AI_GATEWAY_API_KEY`** on the Convex deployment(s) that run the action.

Related: `docs/planning/vercel-deployment-plan.md` (hosting + secrets checklist).

## Related docs

- **Architecture diagram**: `docs/planning/architecture.md`
- **Deployment checklist**: `docs/planning/vercel-deployment-plan.md`
- **Milestones**: `docs/planning/project-plan.md`
