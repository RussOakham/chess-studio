# Database Strategy

## Overview

This document outlines the data and persistence strategy for the chess game application.

**Current stack:**

- **Games, moves, and game_reviews**: Stored in **Convex** (see `apps/web/convex/schema.ts` and `convex/games.ts`). Real-time subscriptions and type-safe queries/mutations.
- **Auth and user data**: Stored in **Convex** via **Better Auth** and the `@convex-dev/better-auth` component. No Neon or Drizzle; auth tables (user, session, account, etc.) live in Convex.

**Neon and Drizzle are retired** – the app uses Convex for all persisted data (games and auth). The sections below are kept for historical context and for teams that might reintroduce a relational DB (e.g. Neon) for optional features like pgvector.

## Database Provider (historical / optional future)

### Neon DB (retired; was used for auth)

Neon was previously used for Better Auth; auth now runs on Convex. If you reintroduce Neon (e.g. for pgvector):

- **Serverless PostgreSQL**: Auto-scaling, pay-per-use
- **Database Branching**: Create dev branches from prod database
- **pgvector Support**: Built-in support for vector embeddings
- **Connection Pooling**: Built-in connection pooling

## Database Extensions

### pgvector ✅ **Selected**

**Purpose**: Vector embeddings for future AI features

- Store chess position embeddings
- Similarity search for game patterns
- AI-powered game analysis
- Position recommendation engine

**Setup**: Enabled by default in Neon DB

## Schema Planning

### Convex (current)

All persisted data is in Convex:

- **Games, moves, game_reviews**: `apps/web/convex/schema.ts`, `convex/games.ts`
- **Auth** (user, session, account, etc.): Stored in Convex via the Better Auth component (`convex/auth.ts`, `@convex-dev/better-auth`)

### Optional future (e.g. Neon + pgvector)

If you add a relational DB later for vector/AI features:

- `position_embeddings` - Vector embeddings of chess positions (pgvector)
- `game_patterns` - Similar game patterns for analysis

## Caching Strategy

**Current app:** All data is in Convex; no separate cache layer is required. Use Next.js built-in caching for API routes and static assets.

**If you add a relational DB later** (e.g. Neon for pgvector):

- Rely on the database and Next.js caching first.
- Add Redis/Upstash only if you see performance issues (e.g. slow position evaluations, high concurrent load, need for sub-millisecond lookups).
- Options: [Upstash](https://upstash.com/) (serverless Redis) or managed Redis.

## Database Branching Workflow

### Development Workflow

1. **Create Feature Branch**

   ```bash
   # Neon CLI or Dashboard
   neon branches create --name feature/new-feature
   ```

2. **Get Branch Connection String**
   - Each branch has its own connection string
   - Use in development environment

3. **Test Migrations**
   - Run migrations on branch
   - Test safely without affecting prod

4. **Merge to Main**
   - Merge code changes
   - Merge database changes (migrations)

### Environment Setup

- **Production**: Main Neon DB branch
- **Staging**: Staging branch (optional)
- **Development**: Feature branches per developer/feature

## Connection Management

### Connection Strings

**Format**: `postgresql://user:password@host/database?sslmode=require`

**Storage**: Managed via Doppler

- Production connection string in `prod` config
- Development connection strings in `dev` configs

### Connection Pooling

- **Neon DB**: Built-in connection pooling
- **Drizzle ORM**: Connection pool configuration
- **Recommendation**: Use Neon's connection pooling

## Migration Strategy

### Drizzle Migrations

1. **Generate Migrations**

   ```bash
   drizzle-kit generate:pg
   ```

2. **Run Migrations**

   ```bash
   drizzle-kit push:pg
   # Or use migration runner
   ```

3. **Version Control**
   - Migrations in `packages/db/migrations/`
   - Tracked in Git
   - Applied via CI/CD or manually

### Migration Workflow

1. Create migration locally
2. Test on feature branch database
3. Merge to main
4. Apply to production (via CI/CD or manual)

## Backup Strategy

### Neon DB Backups

- **Automatic Backups**: Neon DB provides automatic backups
- **Point-in-Time Recovery**: Available in paid tiers
- **Manual Backups**: Export via pg_dump if needed

### Additional Backups

- **S3 Backups**: Store periodic dumps in S3 (managed by Terraform)
- **Retention**: 30-90 days (configurable)

## Performance Optimization

### Indexing Strategy

**Key Indexes** (to be defined with schema):

- `user_id` on games table
- `game_id` on moves table
- `created_at` on games (for history queries)
- Composite indexes for common queries

### Query Optimization

- Use Drizzle's query builder for type safety
- Monitor slow queries
- Use EXPLAIN ANALYZE for optimization
- Consider materialized views for complex queries

### Vector Search Optimization

- Use pgvector indexes (HNSW or IVFFlat)
- Optimize embedding dimensions
- Consider approximate nearest neighbor search

## Monitoring

### Database Metrics

- **Neon DB Dashboard**: Built-in monitoring
- **Connection Pool Metrics**: Monitor pool usage
- **Query Performance**: Track slow queries
- **Storage Usage**: Monitor database size

### Alerts

- High connection count
- Slow query threshold
- Storage limits
- Error rates

## Cost Considerations

### Neon DB Pricing

- **Free Tier**: Generous for development
- **Pay-per-use**: Scales with usage
- **Branch Pricing**: Additional cost per branch (usually minimal)

### Optimization

- Use database branching efficiently (delete unused branches)
- Monitor storage usage
- Optimize queries to reduce compute

## Security

### Connection Security

- **SSL/TLS**: Required (enforced by Neon)
- **Connection Strings**: Stored in Doppler (encrypted)
- **IP Allowlisting**: Configure if needed

### Data Security

- **Encryption at Rest**: Provided by Neon
- **Encryption in Transit**: SSL/TLS
- **Access Control**: Database user permissions
- **Audit Logs**: Available in Neon dashboard

## Resources

- [Neon DB Documentation](https://neon.tech/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Database Branching Guide](https://neon.tech/docs/guides/branching)
