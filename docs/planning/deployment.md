# Deployment Strategy

## Overview

This document outlines the deployment strategy for the chess game application on a private VPS.

## Infrastructure

### Infrastructure as Code

- **Terraform** ✅
  - Manages Route 53 DNS records
  - Manages AWS resources (S3 backups, etc.)
  - Version-controlled infrastructure
  - See `docs/planning/terraform-infrastructure.md` for details

### VPS Provider

- **Hostinger** (or similar private VPS)
- Recommended specs:
  - 2-4 CPU cores
  - 4-8 GB RAM
  - 50+ GB storage
  - Ubuntu 22.04 LTS
- **Note**: VPS provisioning is manual (Hostinger), but DNS is managed by Terraform

### Deployment Management

- **Dokploy** (or similar Docker-based deployment tool)
  - Manages Docker containers
  - Handles deployments via Git webhooks
  - Provides reverse proxy (Nginx)
  - SSL certificate management

### DNS

- **Amazon Route 53** (custom domain)
  - Managed by Terraform
  - A record pointing to VPS IP
  - Optional: CNAME for subdomains (api.yourdomain.com)
  - Version-controlled DNS configuration

## Container Architecture

### Services

1. **Web Container** (Next.js)
   - Port: 3000 (internal)
   - Exposed via Nginx reverse proxy

2. **API Container** (Express.js/Go)
   - Port: 3001 (internal)
   - Exposed via Nginx reverse proxy

3. **Convex** (game/move data and real-time)
   - Managed backend (not a container)
   - Hosted by Convex; `NEXT_PUBLIC_CONVEX_URL` and auth (Better Auth JWT) configured via Doppler

4. **Auth and data**: Convex (games, moves, and auth via Better Auth component). No Neon or Drizzle.

5. **Nginx** (Reverse Proxy)
   - Port: 80, 443
   - Routes:
     - `/` → Web container
     - `/api/*` → API container
   - SSL/TLS termination

## Docker Setup

### Docker Compose Configuration

Located at: `docker/docker-compose.yml`

Key considerations:

- Service dependencies
- Environment variables
- Volume mounts
- Network configuration
- Health checks

### Dockerfiles

- `docker/Dockerfile.web` - Next.js production build
- `docker/Dockerfile.api` - Express.js/Go backend

## Deployment Process

### Initial Setup

1. **Provision VPS** (Hostinger) - Manual step
2. **Set up Terraform infrastructure**
   - Configure AWS credentials
   - Initialize Terraform: `terraform init`
   - Apply infrastructure: `terraform apply`
   - This creates Route 53 DNS records
3. **Configure DNS at domain registrar**
   - Update name servers to Route 53 name servers (from Terraform output)
4. **Install Docker and Docker Compose** on VPS
5. **Install Dokploy** (or alternative) on VPS
6. **Set up SSL certificates** (Let's Encrypt via Dokploy)

### Continuous Deployment

1. **CI/CD Pipeline** (GitHub Actions)
   - Push code to Git repository
   - GitHub Actions triggers (via Blacksmith runners)
   - Run tests, linting, type checking
   - Build Docker images (with caching via Blacksmith/Depot)
   - Push images to container registry
   - See `docs/planning/ci-cd-strategy.md` for details

2. **Infrastructure changes** (if any)
   - Update Terraform files
   - GitHub Actions runs `terraform plan` and `terraform apply`
   - Updates DNS or other infrastructure

3. **Application deployment**
   - GitHub Actions triggers Dokploy webhook (or deploys directly)
   - Pull latest Docker images from registry
   - Docker Compose orchestrates deployment
   - Health checks verify services
   - Nginx reloads configuration

## Environment Configuration

### Secrets Management

- **Doppler** ✅ **Selected**
  - Centralized secrets management
  - Environment-specific configurations (dev, staging, prod)
  - Integration with Docker containers via Doppler CLI
  - Secure secret injection at runtime
  - Version-controlled secret references (not the secrets themselves)
- Alternative: Docker secrets (for simple use cases)
- Never commit secrets to repository
- Doppler service tokens used in deployment pipeline

### Required Environment Variables

#### Web Container

Secrets managed via Doppler:

- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL (games, moves, and auth data)
- `BETTER_AUTH_SECRET` - Better Auth secret key
- `BETTER_AUTH_URL` - Better Auth callback URL

#### API Container

Secrets managed via Doppler:

- `STOCKFISH_PATH` - Path to Stockfish binary (can be env var)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `JWT_SECRET` - JWT signing secret
- `PORT` - API server port (can be env var, default 3001)

#### Convex

- `NEXT_PUBLIC_CONVEX_URL` - From Convex dashboard or CLI; games, moves, and auth (Better Auth) all stored in Convex. See `docs/temp/migrate-convex.temp.md`. Neon and Drizzle are not used.

#### Doppler Integration

Doppler service tokens are injected into containers:

- Each service (web, api) has its own Doppler service token
- Secrets are fetched at container startup
- Environment-specific configs (dev/prod) managed in Doppler
- Docker Compose uses Doppler CLI to inject secrets

## Monitoring & Maintenance

### Logs

- Docker logs: `docker-compose logs -f`
- Dokploy dashboard for aggregated logs
- Consider centralized logging (future)

### Backups

- Database: Daily automated backups
- Volume snapshots: Weekly
- Store backups off-server (S3 bucket managed by Terraform)
- Backup retention policy managed via Terraform (S3 lifecycle rules)

### Updates

- Regular security updates for base images
- Dependency updates via CI/CD (GitHub Actions + Blacksmith)
- Convex schema and function deployments (no Drizzle; Neon retired)
- Automated dependency updates (Dependabot or Renovate)

## Scaling Considerations

### Horizontal Scaling

- Multiple API containers (load balanced)
- Read replicas for database (future)
- CDN for static assets (future)

### Vertical Scaling

- Increase VPS resources as needed
- Monitor resource usage (CPU, RAM, disk)

## Security

### Network Security

- Firewall rules (UFW)
- Only expose necessary ports (80, 443)
- Internal service communication via Docker network

### Application Security

- HTTPS only (SSL/TLS)
- Rate limiting on API endpoints
- Input validation
- Input validation; Convex handles persistence (no SQL/Drizzle in app)

### Container Security

- Non-root users in containers
- Minimal base images
- Regular security scans

## Troubleshooting

### Common Issues

- **Port conflicts**: Check existing services
- **Database connection**: Verify network and credentials
- **SSL certificates**: Check renewal status
- **Container crashes**: Check logs and resource limits

### Debug Commands

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs [service]

# Restart service
docker-compose restart [service]

# Rebuild and restart
docker-compose up -d --build [service]
```
