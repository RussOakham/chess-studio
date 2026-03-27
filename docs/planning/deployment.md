# Deployment strategy

This page indexes **how and where** chess-studio is deployed. Two options are documented: the **current** plan and an **alternate** self-hosted path kept for future flexibility.

## Primary: Vercel (current plan)

- **[`vercel-deployment-plan.md`](./vercel-deployment-plan.md)** — Deploy the Next.js app (`apps/web`) to **[Vercel](https://vercel.com)** (Hobby/free tier), with **[Convex](https://www.convex.dev/)** for data and real-time, **Better Auth**, and **Stockfish** running in the browser (no separate engine server).

## Alternate: self-hosted VPS (future option)

- **[`deployment-alternate-vps-dokploy.md`](./deployment-alternate-vps-dokploy.md)** — Private **VPS** with **Docker**, **Dokploy**, **Nginx**, and optional **Terraform** (e.g. Route 53). Use this as a reference if **Vercel limits**, **cost**, or **operational requirements** make self-hosting attractive. The doc notes where it diverges from today’s **single Next.js app + Convex** layout.

## Related

- [`architecture.md`](./architecture.md) — System architecture and how deployment fits.
- [`ci-cd-strategy.md`](./ci-cd-strategy.md) — GitHub Actions CI (lint, test, build validation).
