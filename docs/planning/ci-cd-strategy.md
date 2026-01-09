# CI/CD Strategy

## Overview

This document outlines the CI/CD strategy for the chess game application using GitHub Actions.

## CI/CD Platform

### GitHub Actions ✅ **Selected**

- Native GitHub integration
- Free tier for public repos
- Extensive marketplace of actions
- Good for monorepo workflows

## CI/CD Strategy

### Recommendation: GitHub Actions Only ✅

**Rationale**:

- GitHub Actions is free for public repos (unlimited minutes)
- GitHub Actions provides 2,000 free minutes/month for private repos
- Sufficient for MVP development
- Can optimize Docker builds later if they become a bottleneck
- Simple setup, no additional services needed

## CI/CD Workflow Structure

### Workflows

```text
.github/workflows/
├── ci.yml              # Continuous Integration (tests, linting)
├── docker-build.yml    # Docker image builds
├── deploy.yml          # Deployment to VPS
└── terraform.yml       # Infrastructure changes
```

### CI Workflow (ci.yml)

**Purpose**: Run on every PR and push to main

**Jobs**:

1. **Lint & Type Check**
   - Lint TypeScript/JavaScript
   - Type checking
   - Format checking

2. **Test**
   - Unit tests
   - Integration tests (if any)
   - Turbo cache for test results

3. **Build**
   - Build Next.js app
   - Build API (if needed)
   - Turbo cache for build artifacts

**Runner**: GitHub Actions (free for public repos, 2,000 min/month for private)

### Docker Build Workflow (docker-build.yml)

**Purpose**: Build and push Docker images

**Jobs**:

1. **Build Web Image**
   - Build Next.js Docker image
   - Tag with commit SHA and branch
   - Push to container registry (Docker Hub, GHCR, etc.)

2. **Build API Image**
   - Build Express.js/Go Docker image
   - Tag with commit SHA and branch
   - Push to container registry

**Runner**: GitHub Actions

### Deploy Workflow (deploy.yml)

**Purpose**: Deploy to production VPS

**Jobs**:

1. **Deploy to VPS**
   - Triggered on merge to main
   - Pull latest Docker images
   - Update docker-compose.yml
   - Deploy via Dokploy or SSH

**Runner**: GitHub Actions

### Terraform Workflow (terraform.yml)

**Purpose**: Manage infrastructure changes

**Jobs**:

1. **Terraform Plan**
   - Run `terraform plan` on PRs
   - Comment plan on PR

2. **Terraform Apply**
   - Run `terraform apply` on merge to main
   - Update DNS, S3 buckets, etc.

**Runner**: GitHub Actions (sufficient for Terraform)

## GitHub Actions Optimization

### Free Tier Limits

- **Public repos**: Unlimited minutes ✅
- **Private repos**: 2,000 minutes/month free
- **Cost after free tier**: $0.008/minute

### Optimization Strategies

1. **Use Caching Aggressively**
   - Cache npm/node_modules
   - Cache Turbo build artifacts
   - Cache Docker layers (when not using Depot)

2. **Parallelize Jobs**
   - Run lint, test, build in parallel
   - Use matrix builds for multiple environments

3. **Conditional Workflows**
   - Only run expensive jobs when needed
   - Skip builds on documentation-only changes

4. **Use Turbo Remote Caching**
   - Share cache across CI runs
   - Significantly speeds up monorepo builds

## Turbo Repo Integration

### Caching Strategy

Turbo Repo benefits from:

- **Turbo Remote Caching**: Share cache across CI runs (free tier available)
- **GitHub Actions cache**: Cache node_modules and build artifacts
- **Docker Buildx caching**: GitHub Actions built-in Docker layer caching

### Turbo Cache Configuration

```yaml
# In workflow
- name: Setup Turbo
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    
- name: Install Turbo
  run: npm install -g turbo

- name: Build with Turbo
  run: turbo build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
```

## Secrets Management in CI/CD

### Doppler Integration

1. **Install Doppler CLI in CI**

   ```yaml
   - name: Install Doppler
     run: |
       curl -Ls --tlsv1.2 --proto "=https" https://cli.doppler.com/install.sh | sh
   
   - name: Run with Doppler
     run: doppler run -- npm test
     env:
       DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
   ```

2. **Use Doppler for Test Secrets**
   - Database connection strings
   - API keys for testing
   - Environment-specific configs

## Cost Analysis

### GitHub Actions (Free Tier)

- **Public repos**: Unlimited minutes ✅
- **Private repos**: 2,000 minutes/month free
- **Cost**: $0.008/minute after free tier
- **Estimated monthly**: $0 (public repo) or $0-40 (private repo, depending on usage)

### Alternative: Self-Hosted Runners

- **Cost**: Free (uses your own infrastructure)
- **Setup**: Requires VPS or local machine
- **Best for**: High-volume builds, cost optimization
- **Trade-off**: Maintenance overhead

### Recommendation

- **For Public Repos**: Use GitHub Actions (unlimited free) ✅
- **For Private Repos**: Use GitHub Actions (2,000 free min/month) ✅
- **Total estimated cost**: $0/month (public) or $0-40/month (private)
- **Future**: Consider self-hosted runner on VPS if build volume increases

## Workflow Examples

### Example: CI Workflow with GitHub Actions

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: turbo test
      env:
        TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

### Example: Docker Build with GitHub Actions (Basic)

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./apps/web
          push: true
          tags: web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Example: Docker Build with GitHub Actions (Optimized)

```yaml
name: Build Docker Images

on:
  push:
    branches: [main]

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./apps/web
          push: true
          tags: web:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Migration Path

### Phase 1: Start with GitHub Actions

1. Set up basic CI/CD workflows
2. Use GitHub Actions cache for npm/node_modules
3. Set up Turbo remote caching
4. Monitor build times and GitHub Actions usage

### Phase 2: Optimize Docker Builds (If Needed)

1. Enable Docker Buildx caching in workflows
2. Optimize Dockerfile structure (multi-stage builds)
3. Monitor Docker build times
4. Consider self-hosted runner if builds are slow

### Phase 3: Optimize

1. Fine-tune caching strategies
2. Optimize workflow dependencies
3. Consider self-hosted runner if volume is high
4. Monitor and adjust

## Best Practices

### Workflow Organization

- Keep workflows focused (one purpose per workflow)
- Use workflow dependencies for parallelization
- Cache dependencies aggressively

### Caching

- Use Turbo remote cache for monorepo builds (free tier available)
- Use GitHub Actions cache for npm/node_modules
- Use Docker Buildx caching for Docker layer caching (GitHub Actions built-in)
- Cache build artifacts between runs

### Security

- Use GitHub secrets for sensitive data
- Use Doppler for test secrets
- Rotate tokens regularly
- Use least-privilege access

### Monitoring

- Track build times in GitHub Actions
- Monitor GitHub Actions usage (minutes consumed)
- Set up alerts for failing builds
- Review GitHub Actions analytics
- Monitor Docker build times and optimize if needed

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Caching](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Turbo CI/CD Guide](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Docker Buildx Cache](https://docs.docker.com/build/cache/)
- [Docker Buildx GitHub Action](https://github.com/docker/setup-buildx-action)
