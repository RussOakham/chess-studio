# Chess Studio

Chess Studio is an **AI-empowered analysis** app: play vs engine, then review games with **engine-backed evaluation**, **best-move annotations**, optional **LLM-written summaries** (grounded in engine output), and a roadmap toward **multi-line engine analysis** (MultiPV) and richer position insight. Built with Next.js 16, React 19, Convex, and client-side Stockfish.

## Status

🚧 **In active development** — core PvE play, review pipeline, and optional AI summaries are in place; see `docs/planning/` for roadmap detail.

## Features

- 🎮 Play chess against the engine (Stockfish in the browser)
- 📊 Live evaluation, hints from engine best moves, post-game analysis (classifications, key moments)
- 🧠 Optional **AI game summary** (Vercel AI Gateway + AI SDK) when `AI_GATEWAY_API_KEY` is configured
- 📜 Game history and replay on the review surface
- 🎨 UI built with Tailwind CSS 4 and ShadCN-style components

**Roadmap (not all shipped):** MultiPV “top lines” on review ([`docs/planning/engine-lines-multipv-prd.md`](docs/planning/engine-lines-multipv-prd.md)), deeper AI-assisted commentary — see [`docs/planning/mvp-features.md`](docs/planning/mvp-features.md).

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix/ShadCN-style UI
- **Data & real time**: Convex (queries/mutations/subscriptions) for games, moves, and reviews
- **Auth**: Better Auth with Convex (sessions and user records in Convex)
- **Chess engine**: Stockfish (client-side worker / WASM) for evals, hints, and analysis
- **AI summaries**: Vercel AI Gateway + AI SDK (`generateText`) in Convex actions (`ai_game_summary`) — not tRPC or a separate REST game API
- **Type safety**: Convex-generated types and strict TypeScript
- **Monorepo**: Turborepo with pnpm workspaces

## Project Structure

This is a monorepo managed with Turborepo and pnpm.

```text
chess-studio/
├── apps/
│   └── web/              # Next.js app; Convex lives under apps/web/convex/
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── chess/            # Chess logic and utilities
│   └── config/           # Shared TypeScript configs
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- **Node.js**: 24.12.0 (LTS) - Use `nvm` to manage versions
- **pnpm**: 10.27.0 or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd chess-studio
   ```

2. **Install Node.js version**

   ```bash
   nvm install
   nvm use
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Set up environment variables**

   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```

   Fill in the required values in each `.env` file.

5. **Start development server**

   ```bash
   pnpm dev
   ```

   The Next.js app will be available at `http://localhost:3000`

### Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages (oxlint with type-aware linting + ESLint for JSON/YAML)
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format all files with oxfmt
- `pnpm clean` - Clean all build artifacts

## Development

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development guidelines.

## Documentation

- **Planning Documents**: See `docs/planning/` for detailed planning documents
- **Architecture**: See `docs/planning/architecture.md`
- **Tech Stack**: See `docs/planning/tech-stack.md`
- **MVP Features**: See `docs/planning/mvp-features.md`

## License

[To be determined]
