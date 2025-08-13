# Deployment Guide

This guide covers deploying VetMed Tracker to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Vercel Deployment](#vercel-deployment)
- [Self-Hosting](#self-hosting)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- A PostgreSQL database (Neon, Supabase, or self-hosted)
- Stack Auth account and project
- Node.js 20+ runtime support
- Environment variables configured

## Environment Setup

### Required Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://user:pass@host/db?sslmode=require&pool=false

# Stack Auth Configuration
NEXT_PUBLIC_STACK_PROJECT_ID=your-stack-project-id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your-publishable-key
STACK_SECRET_SERVER_KEY=your-secret-key

# Optional Services
REDIS_URL=redis://default:password@host:6379
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Performance
TURBO_TOKEN=your-turbo-token
TURBO_TEAM=your-turbo-team
```

### Development vs Production

Development (.env.development):

```env
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/vetmed_dev
```

Production (.env.production):

```env
NODE_ENV=production
DATABASE_URL=postgresql://production-host/vetmed_prod
```

## Vercel Deployment

### 1. One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/yourusername/vet-med-tracker)

### 2. Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 3. Vercel Dashboard Setup

1. Import GitHub repository
2. Configure build settings:
    - Framework: Next.js
    - Build Command: `pnpm build`
    - Output Directory: `.next`
    - Install Command: `pnpm install --frozen-lockfile`

3. Set environment variables in Vercel dashboard
4. Configure domains and deployment settings

### 4. Vercel Configuration

The project includes optimized `vercel.json`:

- Regional deployment (US East by default)
- Function memory and timeout settings
- Security headers
- Caching strategies
- Cron job for notifications

## Self-Hosting

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t vetmed-tracker .
docker run -p 3000:3000 --env-file .env.production vetmed-tracker
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Build application
pnpm build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

ecosystem.config.js:

```javascript
module.exports = {
  apps: [{
    name: 'vetmed-tracker',
    script: 'node_modules/.bin/next',
    args: 'start',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
```

## Database Setup

### 1. Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Create branches:
    - `main` (production)
    - `development`
    - `test`
4. Get connection strings for each branch
5. Run migrations:

```bash
pnpm db:migrate:prod
```

### 2. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Get connection string from Settings > Database
3. Update DATABASE_URL and DATABASE_URL_UNPOOLED
4. Run migrations

### 3. Self-Hosted PostgreSQL

```bash
# Create database
createdb vetmed_tracker

# Run migrations
DATABASE_URL=postgresql://localhost/vetmed_tracker pnpm db:push

# Seed initial data (optional)
pnpm db:seed
```

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health endpoint
curl https://your-domain.com/api/health

# Run smoke tests
pnpm test:e2e --grep smoke
```

### 2. Set Up Monitoring

1. Configure Sentry for error tracking
2. Set up Vercel Analytics
3. Configure uptime monitoring (e.g., Pingdom, UptimeRobot)

### 3. Configure Cron Jobs

For medication reminders, ensure cron job is configured:

- Vercel: Automatically configured via vercel.json
- Self-hosted: Add to crontab:

```bash
0 9 * * * curl https://your-domain.com/api/notifications/scheduler
```

### 4. Security Checklist

- [ ] Environment variables secure
- [ ] Database connection using SSL
- [ ] Stack Auth configured correctly
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Audit logging enabled

## Troubleshooting

### Common Issues

#### Build Failures

```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install --frozen-lockfile
pnpm build
```

#### Database Connection Issues

- Verify DATABASE_URL format
- Check SSL requirements
- Ensure IP whitelisting (if applicable)
- Test connection:

```bash
pnpm db:test:health
```

#### TypeScript Errors

```bash
# Type check
pnpm typecheck

# If errors persist (known issues)
pnpm build  # Build ignores TS errors
```

#### Memory Issues

Increase Node.js memory:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### Performance Optimization

1. Enable Turbo Cache:

```env
TURBO_TOKEN=your-token
TURBO_TEAM=your-team
```

2. Optimize images (if re-enabled):

```javascript
// next.config.js
images: {
  domains: ['your-cdn.com'],
  formats: ['image/avif', 'image/webp']
}
```

3. Enable React Compiler (experimental):
   Already configured in next.config.js

### Rollback Procedure

1. Vercel: Use deployment dashboard to rollback
2. Self-hosted:

```bash
# Revert to previous version
git checkout previous-tag
pnpm install
pnpm build
pm2 reload vetmed-tracker
```

## Support

For deployment issues:

1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review deployment logs
3. Open GitHub issue with deployment details
4. Contact support team

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Stack Auth Docs](https://docs.stack-auth.com)