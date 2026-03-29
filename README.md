# Chess Studio

AI-driven chess game application built with Next.js 16, React 19, and modern web technologies.

## Status

🚧 **In Development** - Initial setup phase

## Features

- 🎮 Play chess against AI engine (Stockfish)
- 🧠 AI-powered move hints and game analysis
- 📊 Engine evaluation and game review
- 📜 Game history and replay
- 🎯 Pre-moves and planned move mode
- 🎨 Modern UI with ShadCN Base UI and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, ShadCN Base UI
- **Backend**: Next.js API Routes; game data and real-time state via Convex
- **Game data**: Convex (queries/mutations, real-time subscriptions) for games and moves
- **Auth**: Better Auth with Convex (auth data and sessions stored in Convex; no Neon or Drizzle)
- **Chess Engine**: Stockfish (client-side WASM)
- **AI**: OpenAI/Anthropic for hints and summaries (planned)
- **Authentication**: Better Auth (Convex JWT integration)
- **Type Safety**: End-to-end type safety via Convex (typed queries/mutations)
- **Monorepo**: Turbo Repo with pnpm workspaces

## Project Structure

This is a monorepo managed with Turbo Repo and pnpm.

```text
chess-game/
├── apps/
│   └── web/              # Next.js web application
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── chess/            # Chess logic and utilities
│   └── config/           # Shared configurations
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
   cd chess-game
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
