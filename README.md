# Chess Game

A chess game application driven by AI/Chess Engine.

## Project Status

🚧 In Planning Phase

See the `docs/planning/` directory for project planning documents.

## Project Structure

```text
chess-game/
├── docs/
│   └── planning/
│       ├── tech-stack.md
│       ├── architecture.md
│       ├── project-plan.md
│       ├── mvp-features.md
│       ├── deployment.md
│       ├── terraform-infrastructure.md
│       ├── doppler-secrets.md
│       ├── ci-cd-strategy.md
│       ├── database-strategy.md
│       └── type-safety-strategy.md
└── README.md
```

## Prerequisites

- **Node.js**: 24.12.0 (LTS) - Managed via [nvm](https://github.com/nvm-sh/nvm)
- **pnpm**: 10.27.0+
- **Homebrew**: For installing nvm (Linux/WSL)

## Getting Started

### 1. Install Node.js

You can install Node.js 24.12.0 (LTS) either via Homebrew or nvm:

**Option A: Via Homebrew (Recommended for system-wide installation)**

```bash
brew install node@24
```

**Option B: Via nvm (Recommended for per-project version management)**

If you don't have nvm installed:

```bash
# Install nvm via Homebrew
brew install nvm

# Add to your shell profile (~/.zshrc or ~/.bashrc)
export NVM_DIR="$HOME/.nvm"
[ -s "/home/linuxbrew/.linuxbrew/opt/nvm/nvm.sh" ] && \. "/home/linuxbrew/.linuxbrew/opt/nvm/nvm.sh"
[ -s "/home/linuxbrew/.linuxbrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/home/linuxbrew/.linuxbrew/opt/nvm/etc/bash_completion.d/nvm"

# Reload your shell
source ~/.zshrc  # or source ~/.bashrc
```

Then install and use the project's Node.js version:

```bash
# Install Node.js 24.12.0 (LTS)
nvm install 24.12.0

# Use the project's Node.js version (automatically reads .nvmrc)
nvm use

# Set as default (optional)
nvm alias default 24.12.0
```

**Verify installation:**

```bash
node --version  # Should output v24.12.0
```

### 2. Install pnpm

```bash
npm install -g pnpm@10.27.0
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Development

```bash
pnpm dev
```
