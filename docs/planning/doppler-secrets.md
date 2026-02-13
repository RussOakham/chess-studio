# Doppler Secrets Management

## Overview

This document outlines how Doppler is used for secrets management in the chess game application.

## Why Doppler?

- **Centralized Management**: All secrets in one place
- **Environment Separation**: Dev, staging, and prod configs
- **Docker Integration**: Seamless integration with Docker Compose
- **Version Control**: Secret references (not secrets) in code
- **Access Control**: Fine-grained permissions per service
- **Audit Logs**: Track who accessed what secrets

## Doppler Setup

### Project Structure

```text
Doppler Project: chess-game
├── dev
│   ├── web (service)
│   ├── api (service)
│   └── db (service)
├── staging
│   ├── web (service)
│   ├── api (service)
│   └── db (service)
└── prod
    ├── web (service)
    ├── api (service)
    └── db (service)
```

### Service Configuration

Each service (web, api, db) has its own Doppler service token for isolation.

## CI (GitHub Actions)

The workflow runs the web app build with `doppler run --project chess-studio --config dev`, so the **dev** config in Doppler must contain all env vars the Next.js build needs.

### Required secrets in Doppler `dev` config

| Secret                        | Where to get it                                                                                    | Notes                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`      | Convex dashboard → your project → Settings → URL, or after `npx convex dev --once --configure=new` | e.g. `https://your-deployment.convex.cloud`  |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Convex dashboard (same project) → site URL for Better Auth                                         | e.g. `https://your-deployment.convex.site`   |
| `BETTER_AUTH_SECRET`          | Generate: `openssl rand -base64 32`                                                                | Use the same value in Convex env and Doppler |
| `BETTER_AUTH_URL`             | Your app URL (for CI build, a placeholder is fine, e.g. `https://example.com`)                     | Required by Better Auth at build time        |

### How to add them

1. **From your existing `.env.local` (recommended)**  
   Ensure `apps/web/.env.local` (or root `.env.local` if you use it for Convex) contains:
   - `NEXT_PUBLIC_CONVEX_URL`
   - `NEXT_PUBLIC_CONVEX_SITE_URL`  
     Then from repo root, after `doppler login`:

   ```bash
   ./scripts/sync-env-to-doppler.sh
   ```

   This syncs those variables into Doppler configs **dev** and **dev_personal**.

2. **Manually in Doppler**  
   In [Doppler](https://dashboard.doppler.com): Project **chess-studio** → Config **dev** → add each key/value above.

### GitHub repository secret

- **`DOPPLER_TOKEN`**: A Doppler service token for project **chess-studio**, config **dev** (read-only is enough).  
  Create in Doppler: Project → Access → Service tokens → Generate. Add the token value as a GitHub repo secret named `DOPPLER_TOKEN`.

## Secrets Managed

### Web Service (Next.js)

Auth and data (games, moves) are in **Convex**; no Neon or Drizzle. Doppler secrets:

```env
# Public (can be in .env.local for dev)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://yourdomain.com

# Secrets (from Doppler)
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=https://yourdomain.com
```

### API Service (Express.js/Go, if used)

```env
# Configuration
PORT=3001
STOCKFISH_PATH=/usr/bin/stockfish

# Secrets (from Doppler)
OPENAI_API_KEY=sk-...
JWT_SECRET=your-jwt-secret-here
```

### Database Service

```env
# Secrets (from Doppler)
POSTGRES_DB=chess_game
POSTGRES_USER=chess_user
POSTGRES_PASSWORD=secure-password-here
```

## Docker Integration

### Docker Compose with Doppler

```yaml
services:
  web:
    build: ./apps/web
    environment:
      # Doppler injects secrets as environment variables
    # Use Doppler CLI to inject secrets
    command: doppler run -- npm start

  api:
    build: ./apps/api
    environment:
      # Doppler injects secrets
    command: doppler run -- node server.js

  db:
    image: postgres:16
    environment:
      # Doppler injects secrets
    command: doppler run -- docker-entrypoint.sh postgres
```

### Alternative: Doppler Secrets Sync

```yaml
services:
  web:
    build: ./apps/web
    environment:
      # Use Doppler secrets sync
      DOPPLER_TOKEN: ${DOPPLER_WEB_TOKEN}
    command: doppler run -- npm start
```

## Development Setup

### Local Development

1. **Install Doppler CLI**

   ```bash
   # macOS
   brew install doppler

   # Linux
   curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A3C913B8.key' | sudo apt-key add -
   echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
   sudo apt-get update && sudo apt-get install doppler
   ```

2. **Authenticate**

   ```bash
   doppler login
   ```

3. **Setup Project**

   ```bash
   doppler setup --project chess-studio --config dev
   ```

4. **Sync .env.local to Doppler (dev and dev_personal)**

   From repo root, after `doppler login`:

   ```bash
   ./scripts/sync-env-to-doppler.sh
   ```

   This sets each variable from `.env.local` (except comments and `DOPPLER_TOKEN`) into Doppler configs `dev` and `dev_personal`. Add any vars from `.env.example` (e.g. `SITE_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`) to `.env.local` first if you want them in Doppler.

5. **Run with Doppler**

   ```bash
   # In apps/web
   doppler run -- npm run dev

   # In apps/api
   doppler run -- npm run dev
   ```

## Production Deployment

### Dokploy Integration

1. **Create Service Tokens in Doppler**
   - Generate service tokens for each service (web, api, db)
   - Store tokens securely in Dokploy environment variables

2. **Docker Compose Configuration**

   ```yaml
   services:
     web:
       image: chess-game-web:latest
       environment:
         DOPPLER_TOKEN: ${DOPPLER_WEB_TOKEN} # From Dokploy env vars
       command: doppler run -- npm start
   ```

3. **Deployment Script**

   ```bash
   # Install Doppler CLI in container or use Doppler's Docker image
   docker run -it --rm \
     -e DOPPLER_TOKEN="${DOPPLER_WEB_TOKEN}" \
     dopplerhq/cli:latest \
     doppler secrets download --no-file --format env > .env
   ```

### Alternative: Doppler Secrets Download

For containers without Doppler CLI:

```yaml
services:
  web:
    build: ./apps/web
    environment:
      DOPPLER_TOKEN: ${DOPPLER_WEB_TOKEN}
    # Use init container or entrypoint script to download secrets
    entrypoint: /bin/sh -c "doppler secrets download --no-file --format env > .env && npm start"
```

## Best Practices

### Secret Organization

- **Group related secrets**: Database credentials together
- **Use consistent naming**: `DATABASE_URL`, `API_KEY`, etc.
- **Document secrets**: Add descriptions in Doppler UI
- **Use references**: Reference shared secrets across services

### Access Control

- **Service-specific tokens**: Each service has its own token
- **Read-only tokens**: Use read-only tokens in production
- **Rotate regularly**: Rotate service tokens periodically
- **Monitor access**: Review Doppler audit logs

### Environment Management

- **Separate configs**: Dev, staging, prod in separate Doppler configs
- **Sync strategy**: Use Doppler sync to keep configs in sync (with overrides)
- **Fallback values**: Use `.env.example` files for public configs

### Security

- **Never commit tokens**: Service tokens never in Git
- **Rotate secrets**: Regularly rotate API keys, passwords
- **Least privilege**: Tokens only have access to needed secrets
- **Audit access**: Review who accessed secrets and when

## Migration from Manual Secrets

### Step 1: Create Doppler Project

1. Create project in Doppler dashboard
2. Create configs: dev, staging, prod
3. Create services: web, api, db

### Step 2: Import Secrets

1. Add all existing secrets to Doppler
2. Verify secrets are correct
3. Test with Doppler CLI locally

### Step 3: Update Docker Compose

1. Add Doppler CLI to containers (or use Doppler image)
2. Update service commands to use `doppler run`
3. Remove hardcoded secrets from compose file

### Step 4: Deploy

1. Generate service tokens
2. Add tokens to Dokploy environment variables
3. Deploy and verify secrets are injected correctly

## Troubleshooting

### Common Issues

**Secrets not loading**

- Verify Doppler token is set correctly
- Check service token has access to correct config
- Ensure Doppler CLI is installed in container

**Wrong environment**

- Verify `DOPPLER_CONFIG` is set correctly
- Check service token is for correct config

**Permission denied**

- Verify service token has read access
- Check token hasn't expired
- Review Doppler access logs

### Debug Commands

```bash
# Test Doppler connection
doppler secrets

# Verify specific secret (e.g. web app auth)
doppler secrets get BETTER_AUTH_SECRET

# Check current config
doppler configure get

# List all secrets (be careful!)
doppler secrets
```

## Resources

- [Doppler Documentation](https://docs.doppler.com/)
- [Doppler Docker Integration](https://docs.doppler.com/docs/docker)
- [Doppler CLI Reference](https://docs.doppler.com/docs/cli)
