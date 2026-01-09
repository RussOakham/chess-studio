# Contributing to Chess Studio

Thank you for your interest in contributing to Chess Studio! This document provides guidelines and instructions for contributing to the project.

## Development Setup

### Prerequisites

- **Node.js**: 24.12.0 (LTS) - Use `nvm` to manage versions
- **pnpm**: 10.27.0 or higher
- **Git**: Latest version

### Initial Setup

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
   cp packages/db/.env.example packages/db/.env
   ```

   Fill in the required values in each `.env` file.

5. **Start development server**

   ```bash
   pnpm dev
   ```

## Project Structure

```text
chess-game/
├── apps/
│   └── web/              # Next.js 16 web application
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── chess/            # Chess logic and utilities
│   ├── db/               # Database schema and client (Drizzle ORM)
│   └── config/           # Shared configurations (ESLint, Prettier, TypeScript)
└── docs/                 # Documentation
```

## Development Workflow

### Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm format` - Format all files with Prettier
- `pnpm clean` - Clean all build artifacts

### Package-Specific Scripts

Each package/app has its own scripts. Run them with:

```bash
pnpm --filter @repo/web dev
pnpm --filter @repo/types build
```

### Code Quality

#### Linting

We use ESLint 9 with flat config. Linting runs automatically on commit via Husky.

```bash
pnpm lint
```

#### Formatting

We use Prettier for code formatting. Formatting runs automatically on commit.

```bash
pnpm format
```

#### Type Checking

TypeScript strict mode is enabled. Type checking runs as part of the build process.

```bash
pnpm type-check
```

### Git Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards
   - Write/update tests if applicable
   - Update documentation if needed

3. **Commit your changes**

   We use [Conventional Commits](https://www.conventionalcommits.org/):

   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "docs: update documentation"
   ```

4. **Push and create a Pull Request**

   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use type imports: `import type { ... }`
- Follow the existing code style

### React/Next.js

- Use functional components with hooks
- Use Server Components by default (Next.js App Router)
- Client Components only when necessary (use `"use client"`)
- Follow React best practices

### File Naming

- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- Types: `camelCase.ts` or `types.ts`
- Config files: `kebab-case.config.js`

### Imports

- Use path aliases: `@/components`, `@repo/types`, etc.
- Group imports: external, internal, relative
- Use absolute imports when possible

## Testing

Testing setup will be added in a future phase. For now, focus on:

- Manual testing of features
- Type safety (TypeScript)
- Linting and formatting

## Documentation

- Update `README.md` for user-facing changes
- Update `docs/` for architectural changes
- Add JSDoc comments for public APIs
- Keep `CONTRIBUTING.md` up to date

## Questions?

If you have questions or need help, please:

1. Check the existing documentation
2. Review the codebase
3. Open an issue for discussion

Thank you for contributing to Chess Studio! 🎉
