# Vercel deployment plan

## Status

**Current intent:** Deploy the **Next.js web app** to **[Vercel](https://vercel.com)** on the **free (Hobby) tier** for simplicity and low operational overhead.

This document is the **active deployment overview** for that approach. An **alternate** self-hosted strategy (VPS / Docker / Dokploy) is documented in [`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md); see also the index at [`deployment.md`](./deployment.md).

## What gets deployed where

| Piece                                                 | Where it runs                                        | Notes                                                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Next.js app** (`apps/web`, package `@repo/web`)     | Vercel                                               | Server and client bundles, Server Actions, route handlers.                                             |
| **Convex** (queries, mutations, schema, HTTP actions) | [Convex Cloud](https://docs.convex.dev/)             | Deployed with `npx convex deploy` (or CI) to a **production** Convex deployment; separate from Vercel. |
| **Stockfish**                                         | Browser (Web Worker) via the `stockfish` npm package | Matches local dev; no separate engine server required for the current architecture.                    |
| **Auth**                                              | Better Auth + Convex integration                     | Production URLs and secrets must match the Vercel hostname(s).                                         |

The monorepo uses **pnpm**, **Turborepo**, and **Node 24** (see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). CI already builds the web app with **Doppler**-injected env for `next build`.

## Why Vercel (free tier)

- **Git-connected deploys:** Push to the default branch → preview/production builds without maintaining a VPS.
- **Next.js-first:** Zero-config defaults for App Router, images, and serverless/Fluid compute patterns.
- **Cost:** Hobby tier is suitable for personal projects and early MVPs; **limits and quotas change**—verify [Vercel pricing](https://vercel.com/pricing) before locking in assumptions.

**Tradeoffs to expect on free tier:** bandwidth and build-minute caps, team features, and fewer seats than paid plans. If the app grows (heavy AI routes, long-running work), revisit plan limits or move specific workloads (e.g. background jobs) elsewhere.

## High-level setup steps

1. **Create a Vercel project** linked to this Git repository.
2. **Configure the monorepo:**
   - Set the **root directory** to `apps/web` _or_ use Vercel’s monorepo support with an appropriate **install** / **build** command at the repo root (e.g. `pnpm install` from root, `pnpm exec turbo run build --filter=@repo/web` or `cd apps/web && pnpm build`).
   - Align **Node** version with the repo (24.x) in Project Settings or `package.json` `engines` if you add one.
3. **Environment variables** in Vercel (see below)—must mirror what Doppler provides for production builds locally/CI, especially `NEXT_PUBLIC_CONVEX_URL` and Better Auth–related values.
4. **Convex production:** Create/use a **production** Convex deployment; run `npx convex deploy` from `apps/web` (or automate in CI) so server functions and schema match what the Vercel build expects.
5. **Better Auth:** Set `BETTER_AUTH_URL` (and any callback URLs) to the **production** Vercel URL (and custom domain if used).
6. **Smoke-test** preview deployments on each PR after the first successful production deploy.

Exact button clicks change in the Vercel dashboard; treat this as a checklist, not a screenshot guide.

## CI vs hosting

- **GitHub Actions** ([`ci.yml`](../../.github/workflows/ci.yml)): runs on pull requests—format, lint, type-check, tests, and a **Next.js production build** (with Doppler). This validates the repo; it does **not** define production hosting by itself.
- **Vercel:** typically connected to the same repo to **build and deploy** on push (and PR previews). No `vercel.json` is required in-repo for a basic Next.js deploy; add one later if you need rewrites, headers, or cron.

## Environment variables and secrets

Production needs at least:

- **`NEXT_PUBLIC_CONVEX_URL`** — Convex deployment URL for the browser and server.
- **Better Auth** — e.g. `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and any Convex/Better Auth integration variables your [`convex/auth`](../../apps/web/convex/auth.ts) setup requires.

**Doppler today:** Local and CI use the Doppler CLI (`doppler run`) for `apps/web` builds. On Vercel you can:

- **Manually** copy or sync secrets into Vercel Project → Environment Variables, or
- Use **Doppler’s Vercel integration** (or `doppler secrets download` in a controlled CI step) so a single source of truth remains Doppler.

Never commit `.env*.local` or raw secrets to git.

### Production hostname alignment (chess-studio)

When the live site is **`https://chess-studio-steel.vercel.app`** (or another Vercel URL), keep these aligned:

- **Vercel (Production and Preview):** `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `BETTER_AUTH_URL` — same origin as the deployment.
- **Convex production:** `SITE_URL` — same origin; `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if you use GitHub sign-in.
- **GitHub OAuth app:** add **Authorization callback URL** `https://chess-studio-steel.vercel.app/api/auth/callback/github` (update if the hostname changes).

After changing environment variables, trigger a **new production deployment** (push to the production branch, or **Deployments → Redeploy** in Vercel). Local `vercel --prod` from `apps/web` can fail with a doubled `apps/web/apps/web` path when the project **Root Directory** is also `apps/web`; Git-connected builds avoid that.

## Convex deploy cadence

- **Application code** (Next.js) deploys when Vercel builds.
- **Convex code** deploys when you run `convex deploy` (or your automation does). Keep these in sync when you change Convex APIs or schema—otherwise the site can call missing or outdated functions.

Document your team’s rule of thumb (e.g. “deploy Convex before or with the Vercel production deploy that depends on it”).

## Custom domain (optional)

Hobby supports custom domains. Point DNS per Vercel’s wizard, then update **Better Auth** and any allowlists to the new hostname.

## Differences from alternate self-hosted deployment

Compared to [`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md):

| Topic         | Alternate (VPS / Dokploy)                  | This plan (Vercel)                |
| ------------- | ------------------------------------------ | --------------------------------- |
| App hosting   | VPS + Docker + Nginx                       | Vercel serverless/Fluid Next.js   |
| API container | Optional Express/Go container (design-era) | Not used; Convex + Next.js routes |
| SSL           | Dokploy / Let’s Encrypt on VPS             | Vercel-managed TLS                |
| Secrets       | Doppler → Docker                           | Doppler and/or Vercel env         |

## Pre-launch checklist

- [ ] Vercel project builds `apps/web` successfully with production env vars.
- [ ] Convex **production** deployment exists and URL matches `NEXT_PUBLIC_CONVEX_URL`.
- [ ] Auth callbacks and cookie settings work on the Vercel URL (and custom domain if any).
- [ ] Lichess or other third-party keys (if used server-side) are set in Vercel for Production.
- [ ] Run through a full game + review flow on the production URL.

## Open follow-ups

- Whether to add a **Vercel** GitHub Action for deploy visibility, or rely entirely on Vercel’s Git integration.
- Whether to pin **`engines.node`** in `package.json` for consistent local/CI/Vercel versions.
- **AI / future features:** If you add server-side LLM calls, confirm **function duration and region** fit Hobby limits or adjust architecture.
