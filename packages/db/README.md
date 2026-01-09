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

```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations to database
pnpm db:push

# Or use migrations (recommended for production)
pnpm db:migrate
```

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

- **pgvector**: Enabled for future vector search features
