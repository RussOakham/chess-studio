# Chess Studio (`apps/web`)

Next.js 16 app (App Router) for Chess Studio: play vs engine, game history, and **review** with Stockfish-backed analysis and optional **AI summaries** (Convex actions + Vercel AI Gateway).

- **Convex** — `convex/` holds schema, queries, mutations, and actions (`games`, `reviews`, `ai_game_summary`, Lichess cache, etc.).
- **From monorepo root** — `pnpm install`, `pnpm dev`, and `pnpm --filter @repo/web run convex:dev` when developing Convex locally.

See the repository **[README](../../README.md)** and **[docs/planning/architecture.md](../../docs/planning/architecture.md)** for architecture and env vars (`AI_GATEWAY_API_KEY`, Convex URLs, Better Auth).

## Local dev (this package)

```bash
# From repo root (recommended)
pnpm dev

# Or only the web app
pnpm --filter @repo/web dev
```

Open [http://localhost:3000](http://localhost:3000).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
