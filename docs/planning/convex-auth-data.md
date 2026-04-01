# Convex, auth, and data

Canonical reference for how the app uses Convex and authentication.

## Stack

- **Convex** is the database and backend for games, moves, reviews, Lichess explorer cache, and related tables. Real-time queries use Convex subscriptions.
- **Better Auth** is integrated via the Convex Better Auth component. User/session data lives in Convex; protected Convex functions use `ctx.auth.getUserIdentity()`.
- **No Postgres/Drizzle** — auth and app data are Convex-only.

## Environment

- **`NEXT_PUBLIC_CONVEX_URL`** — Convex deployment URL (Uniform Resource Locator); use the value from the dashboard or `npx convex dev`.
- Better Auth secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.) as required by your hosting setup.

## AI Gateway and LLM calls (Vercel AI SDK)

Convex **`"use node"` actions** that call `generateText` / the gateway run on **Convex’s servers**, not on Vercel. Environment variables from Vercel are **not** injected there automatically.

### Authentication options (pick one pattern)

1. **API key (recommended for Convex)**  
   Create a key in the Vercel dashboard: [AI Gateway API keys](https://vercel.com/docs/ai-gateway/authentication) (team → AI Gateway → API keys).  
   Set **`AI_GATEWAY_API_KEY`** on each Convex deployment that runs those actions:

   ```bash
   cd apps/web && npx convex env set AI_GATEWAY_API_KEY "your_key_here"
   ```

   Use the **same** variable name the AI SDK expects by default. Optionally add the key to Doppler / Vercel env for **Next.js** route handlers if you call the gateway from the app router later.

2. **OIDC (`VERCEL_OIDC_TOKEN`)**  
   [Vercel OIDC](https://vercel.com/docs/oidc) is injected on **Vercel** deployments and can be pulled locally with `vercel env pull` (~12-hour token; re-pull for long local sessions). It does **not** populate Convex; use an API key on Convex unless you introduce a custom token exchange.

### Optional tuning

- **`AI_GAME_SUMMARY_MODEL`** — Override the default model id (`provider/model` string) used by `apps/web/lib/ai/config.ts`. Set on Convex if generation runs only in actions; mirror on Vercel if you also generate from Next.js.

### Checklist

- [ ] Create or confirm a Vercel project is linked (`apps/web` has `.vercel/project.json`).
- [ ] Create an **AI Gateway API key** in the dashboard (or rely on OIDC **only** for code running on Vercel).
- [ ] Set **`AI_GATEWAY_API_KEY`** on **Convex** (dev and production deployments as needed).
- [ ] Add the same key (or OIDC-related vars) to **local** `.env.local` / Doppler / CI per your workflow; never commit secrets.

## Validation and access patterns

See **[Convex validation and access patterns](./convex-validation-patterns.md)** for when to use `authed_functions` wrappers, `game_access`, and Zod for shared id parsing.

## Code map

- `apps/web/lib/validation/game-id.ts` — Zod schema and helpers for game id strings from URLs/props (`gameIdParamSchema`, `parseGameIdParam`); `@/lib/convex-id` re-exports for stable imports.
- `apps/web/convex/schema.ts` — table definitions.
- `apps/web/convex/auth.ts` — Better Auth integration with Convex.
- `apps/web/convex/lib/game_access.ts` — shared helpers: `getAuthedUserId`, `requireOwnedGame` (JWT subject + game ownership).
- `apps/web/convex/lib/authed_functions.ts` — `authedQuery` / `authedMutation` / `authedAction` (expose `ctx.userId`) and `ownedGameQuery` / `ownedGameMutation` (expose `ctx.game` after ownership check), via `convex-helpers`.
- `apps/web/convex/games.ts`, `reviews.ts`, `lichess_explorer.ts`, `lichess_explorer_cache.ts` — domain Convex functions (queries, mutations, actions).

## Lichess Opening Explorer (optional)

Server-side batch fetch is exposed as **`api.lichess_explorer.batchExplorerMasters`** (Convex action). Set **`LICHESS_API_TOKEN`** on the Convex deployment for authenticated upstream Application Programming Interface (API) access. See `docs/game-review-cross-cutting-qa.md`.
