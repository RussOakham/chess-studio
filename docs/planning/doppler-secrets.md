# Doppler secrets management

## Overview

[Doppler](https://www.doppler.com/) centralizes secrets for **local development**, **CI**, and syncing with **Vercel**. Examples use project name **`chess-studio`**; older names may exist in existing accounts.

## Why Doppler?

- Centralized secrets with dev / staging / prod configs
- Service tokens for CI (e.g. GitHub Actions) without committing values
- Optional [Vercel integration](https://docs.doppler.com/docs/vercel) to map configs to Vercel environments
- Audit logs and access control in the Doppler dashboard

## Project layout (example)

```text
Doppler project: chess-studio
├── dev          # local + CI build (see ci.yml)
├── dev_personal # optional per-developer (if used)
├── stg          # optional
└── prd          # production-aligned values for Vercel Production
```

Only the **web app** (`apps/web`) needs these for Next.js builds. **Convex** has its own environment variables (`npx convex env set` or dashboard); keep shared secrets (e.g. `BETTER_AUTH_SECRET`) aligned between Doppler and Convex where both need the same value.

### Service tokens

Use a **read-only** service token for the **`dev`** config in GitHub as **`DOPPLER_TOKEN`** so CI can run `doppler run` for `next build`. Production may use Doppler’s Vercel integration or manual env copy.

## CI (GitHub Actions)

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs the web build with Doppler (e.g. `doppler run --project chess-studio --config dev`). The **`dev`** config must include every variable required for a production Next.js build of `apps/web`.

### Required secrets in Doppler `dev` (typical)

| Secret                        | Notes                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`      | From Convex dashboard or `npx convex dev`                                                                            |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex `.convex.site` URL for Better Auth                                                                            |
| `BETTER_AUTH_SECRET`          | Same value as on Convex when shared                                                                                  |
| `BETTER_AUTH_URL`             | Placeholder acceptable for CI if the build only needs it to exist                                                    |
| `LICHESS_API_TOKEN`           | Optional; also set on Convex for explorer actions                                                                    |
| `AI_GATEWAY_API_KEY`          | For Convex actions that call the gateway; set on Convex for runtime. See [`stack-and-data.md`](./stack-and-data.md). |

### Populate from `.env.local`

From repo root, after `doppler login`:

```bash
./scripts/sync-env-to-doppler.sh
```

This syncs variables into **`dev`** and **`dev_personal`** from your local env (see script for behavior).

### GitHub repository secret

- **`DOPPLER_TOKEN`** — service token with access to project **chess-studio**, config **dev** (read-only is enough).

## Production (`prd`) and Vercel

Use **`prd`** as the source of truth for **Vercel Production** when using [Doppler’s Vercel integration](https://docs.doppler.com/docs/vercel): link project **chess-studio** → **`prd`** → Vercel **Production** (and optionally **`stg`** → **Preview**).

### Required for a working production app

Align **Vercel**, **Doppler `prd`**, and **Convex production** for:

- `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`
- `NEXT_PUBLIC_SITE_URL`, `SITE_URL`, `BETTER_AUTH_URL` (canonical origin)
- `BETTER_AUTH_SECRET` (match Convex)
- OAuth client IDs/secrets if used (`GITHUB_*`, etc.)

Convex **does not** read Vercel env automatically for `"use node"` actions — set `AI_GATEWAY_API_KEY`, `LICHESS_API_TOKEN`, etc. on the Convex deployment as needed.

### Checklist

- [ ] Doppler **`prd`** contains all required web vars.
- [ ] Vercel ↔ Doppler integration maps **`prd`** to Production (if used).
- [ ] Convex **production** env matches for shared secrets and server-side keys.

### Example `prd` snippet (web)

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
SITE_URL=https://your-app.vercel.app
BETTER_AUTH_URL=https://your-app.vercel.app
BETTER_AUTH_SECRET=...
```

## Local development

1. Install the [Doppler CLI](https://docs.doppler.com/docs/install-cli).
2. `doppler login` then `doppler setup --project chess-studio --config dev`.
3. Run the app, for example:

   ```bash
   cd apps/web
   doppler run -- pnpm dev
   ```

## Troubleshooting

```bash
doppler secrets
doppler secrets get BETTER_AUTH_SECRET
doppler configure get
```

## Resources

- [Doppler documentation](https://docs.doppler.com/)
- [Doppler CLI](https://docs.doppler.com/docs/cli)
