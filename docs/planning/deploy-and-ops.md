# Deploy and ops (canonical)

This is the canonical reference for **deploying** and **operating** Chess Studio: Vercel hosting, Convex deploys, CI, and secrets.

## What runs where

| Piece                              | Where it runs    | Notes                                                               |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------- |
| Next.js app (`apps/web`)           | Vercel           | Git-connected builds, previews, and production deploys              |
| Convex backend (`apps/web/convex`) | Convex Cloud     | Schema + queries/mutations/actions; deployed separately from Vercel |
| Stockfish                          | Browser (worker) | No engine service in this architecture                              |

## Deployment model (rule of thumb)

- **Vercel deploy** happens on push (and PR previews) via Git integration.
- **Convex deploy** happens when you run `npx convex deploy` (or automation does).

If a change touches `apps/web/convex/**` or its public API/schema, deploy Convex **before or alongside** the Vercel production deploy that depends on it.

## CI (GitHub Actions)

CI runs in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) and is responsible for:

- formatting / lint / type-check / tests
- a production **Next.js build** for `apps/web`
- markdown lint (`pnpm lint:md`)

## Secrets (Doppler + Vercel + Convex)

This repo uses **Doppler** as the source of truth for web build secrets (local + CI, and optionally sync into Vercel).

Important boundary: **Convex actions run on Convex**, so Vercel environment variables are **not automatically available** there.

### CI secret

- **`DOPPLER_TOKEN`**: GitHub Actions secret used to run `doppler run` for builds.

### Web app env (Vercel / Doppler)

Typical required variables:

- `NEXT_PUBLIC_CONVEX_URL`
- Better Auth variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, etc.)

### Convex env (Convex Cloud)

Set on Convex deployments (dashboard or `npx convex env set`), especially for server-side calls:

- `AI_GATEWAY_API_KEY` (for AI summaries in Convex actions)
- `LICHESS_API_TOKEN` (if you use Lichess explorer actions with auth)

## Pre-launch checklist

- [ ] Vercel builds `apps/web` with production env vars
- [ ] Convex production deployment exists and matches `NEXT_PUBLIC_CONVEX_URL`
- [ ] Auth callbacks work on the production origin (and custom domain if used)
- [ ] Run a full “new game → finish → review” flow on production
