# CI/CD strategy

## Overview

**Continuous integration** runs on **GitHub Actions**. **Production deployment** is via **Vercel’s Git integration** (build and deploy on push/PR); Convex backend updates use **`npx convex deploy`** (or your automation) when schema or functions change.

## GitHub Actions

The repo ships one workflow file, [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), on **pull requests** (all branches). It defines several **jobs**:

| Job              | What it runs                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Setup**        | Install deps, Turbo cache, Doppler CLI; **`pnpm turbo run build --filter=!@repo/web`**, then **`next build`** for `apps/web` via **`doppler run`** (needs **`DOPPLER_TOKEN`**) |
| **Format check** | **`pnpm format`** (check only)                                                                                                                                                 |
| **Lint**         | After Setup: **`pnpm lint`**                                                                                                                                                   |
| **Type check**   | After Setup: **`pnpm type-check`**                                                                                                                                             |
| **Test**         | After Setup: **`pnpm test`**                                                                                                                                                   |
| **Docs**         | **`pnpm lint:md`**                                                                                                                                                             |

Lint, type-check, and test **depend on** Setup so they can reuse cached build outputs.

There are **no** Terraform, Docker-build, or VPS deploy workflows in this repository.

## Secrets in CI

CI builds may use **`DOPPLER_TOKEN`** (repository secret) so `doppler run` can inject env vars for `next build`. Document required keys in [`doppler-secrets.md`](./doppler-secrets.md).

## Deployment (hosting)

- **Frontend:** Vercel — see [`vercel-deployment-plan.md`](./vercel-deployment-plan.md).
- **Convex:** Convex Cloud — deploy from `apps/web` with `npx convex deploy`; keep in sync when changing `convex/` APIs or `schema.ts`.

## Related

- [`deployment.md`](./deployment.md) — one-page deployment index.
