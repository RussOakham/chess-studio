# CI/CD strategy

## Overview

**Continuous integration** runs on **GitHub Actions**. **Production deployment** is via **Vercel’s Git integration** (build and deploy on push/PR); Convex backend updates use **`npx convex deploy`** (or your automation) when schema or functions change.

## GitHub Actions

The repo ships a single workflow:

| File         | Purpose                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **`ci.yml`** | On PRs/pushes: format check, lint, type-check, tests, **Next.js production build** (often with **Doppler**). |

There are **no** Terraform, Docker-build, or VPS deploy workflows in this repository.

See [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) for exact jobs and triggers.

## Secrets in CI

CI builds may use **`DOPPLER_TOKEN`** (repository secret) so `doppler run` can inject env vars for `next build`. Document required keys in [`doppler-secrets.md`](./doppler-secrets.md).

## Deployment (hosting)

- **Frontend:** Vercel — see [`vercel-deployment-plan.md`](./vercel-deployment-plan.md).
- **Convex:** Convex Cloud — deploy from `apps/web` with `npx convex deploy`; keep in sync when changing `convex/` APIs or `schema.ts`.

## Related

- [`deployment.md`](./deployment.md) — one-page deployment index.
