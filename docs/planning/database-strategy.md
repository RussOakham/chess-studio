# Database Strategy

## Overview

This document outlines the database strategy for the chess game application, including Neon DB setup, pgvector configuration, and caching considerations.

## Database Provider

### Neon DB ✅ **Selected**

**Why Neon DB?**

- **Serverless PostgreSQL**: Auto-scaling, pay-per-use
- **Database Branching**: Create dev branches from prod database (game-changing feature!)
- **pgvector Support**: Built-in support for vector embeddings
- **Great Free Tier**: Generous free tier for development
- **Excellent DX**: Easy setup, good documentation
- **Connection Pooling**: Built-in connection pooling

**Database Branching Benefits**:

- Create feature branches with isolated database copies
- Test migrations safely
- Easy rollback
- Perfect for development workflow

## Database Extensions

### pgvector ✅ **Selected**

**Purpose**: Vector embeddings for future AI features

- Store chess position embeddings
- Similarity search for game patterns
- AI-powered game analysis
- Position recommendation engine

**Setup**: Enabled by default in Neon DB

## Schema Planning

### Current Considerations (To be detailed after MVP)

**Core Tables**:

- `users` - User accounts (Better Auth may handle this)
- `games` - Chess games
- `moves` - Individual moves in games
- `game_reviews` - AI-generated game reviews
- `positions` - Cached position evaluations (optional)

**Future Tables** (for vector features):

- `position_embeddings` - Vector embeddings of chess positions
- `game_patterns` - Similar game patterns for analysis

**Note**: Detailed database schema diagram will be created after MVP functionality is defined.

## Caching Strategy

### Do We Need Redis/Upstash?

**Potential Use Cases**:

1. **Stockfish Position Evaluations**
   - Cache common position evaluations
   - Avoid re-calculating same positions
   - **Decision**: Start without, add if needed

2. **Game State Caching**
   - Cache active game states
   - Quick retrieval for ongoing games
   - **Decision**: PostgreSQL is sufficient initially

3. **API Response Caching**
   - Cache game history queries
   - Cache user profile data
   - **Decision**: Use Next.js built-in caching first

4. **Session Data**
   - Better Auth handles sessions
   - **Decision**: No additional cache needed

### Recommendation: Start Without Dedicated Cache ✅

**Rationale**:

- Neon DB is fast (serverless, optimized)
- PostgreSQL has good query performance
- Next.js has built-in caching for API routes
- Add Redis/Upstash only if performance issues arise

### When to Add Redis/Upstash

**Add caching if**:

- Position evaluation queries become slow
- High concurrent game load
- Need sub-millisecond lookups
- API response times degrade

**Options**:

- **Upstash**: Serverless Redis, good free tier, pay-per-request
- **Redis**: Traditional Redis (self-hosted or managed)

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
