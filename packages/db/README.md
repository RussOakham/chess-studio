# Database Package

This package contains the database schema, client configuration, and migrations for Chess Studio.

## Setup

### Prerequisites

- Neon DB project created
- `DATABASE_URL` environment variable set

### Environment Variables

Create a `.env.local` file in this directory (or set `DATABASE_URL` in your environment):

```bash
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

The connection string can be obtained from your Neon project dashboard.

### Database Schema

The database includes the following tables:

- **users**: User accounts
- **games**: Chess games
- **moves**: Individual moves in games
- **game_reviews**: AI-generated game reviews

### Running Migrations

#### Development Workflow

For active development, use `db:push` to sync schema directly:

```bash
# Sync schema directly to database (fast, no migration files)
pnpm db:push
```

**Use `db:push` when:**

- Actively developing and iterating on schema
- Working on feature branches
- Need quick schema updates

#### Production Workflow

For production and version control, use migrations:

```bash
# 1. Generate migration from schema changes
pnpm db:generate

# 2. Review the generated migration file in drizzle/

# 3. Apply migration to database
pnpm db:migrate
```

**Use `db:generate` + `db:migrate` when:**

- Committing schema changes to version control
- Deploying to production
- Working with a team (migrations are tracked in git)

#### Important Notes

- **Never manually edit migration files** - always use `db:generate`
- Edit schema files (`src/schema/*.ts`) instead of migration SQL
- Migration files are auto-generated and should not be modified
- See `@.cursor/rules/database-migrations.mdc` for detailed guidelines

### Drizzle Studio

View and edit your database using Drizzle Studio:

```bash
pnpm db:studio
```

## Neon Project Details

- **Project ID**: `sweet-cherry-77619284`
- **Database**: `neondb`
- **Branch**: `main` (br-still-wave-aeab0k3v)
- **Region**: `aws-us-east-2`
- **PostgreSQL Version**: 17

## Extensions

- **pg_uuidv7**: Enabled for UUID v7 generation (time-ordered UUIDs)
- **pgvector**: Enabled for future vector search features
