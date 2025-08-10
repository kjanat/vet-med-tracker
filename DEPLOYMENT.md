# VetMed Tracker - Production Deployment Guide

This document provides comprehensive guidance for deploying and managing the VetMed Tracker application in production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Deployment Process](#deployment-process)
- [Health Checks](#health-checks)
- [Monitoring & Observability](#monitoring--observability)
- [Feature Flags](#feature-flags)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Procedures](#emergency-procedures)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services
- **Vercel Account**: For application hosting
- **Neon Database**: PostgreSQL database hosting
- **Stack Auth**: User authentication service
- **Upstash Redis**: Caching and session storage (optional)
- **GitHub**: Source control and CI/CD

### Required Secrets
Configure these secrets in your deployment environment:

```bash
# Database
DATABASE_URL="postgresql://user:password@host-pooler.region.neon.tech/db"
DATABASE_URL_UNPOOLED="postgresql://user:password@host.region.neon.tech/db"

# Authentication (Stack Auth)
NEXT_PUBLIC_STACK_PROJECT_ID="your-project-id"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="your-publishable-key"
STACK_SECRET_SERVER_KEY="your-secret-key"

# Push Notifications
VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_SUBJECT="mailto:your-email@domain.com"

# Redis (Optional)
REDIS_URL="redis://default:password@host:port"

# Vercel Deployment
VERCEL_TOKEN="your-vercel-token"
VERCEL_ORG_ID="your-org-id"  
VERCEL_PROJECT_ID="your-project-id"
```

### Staging Environment
Set up staging environment with separate database and authentication:

```bash
STAGING_DATABASE_URL="postgresql://staging-connection-string"
STAGING_DATABASE_URL_UNPOOLED="postgresql://staging-unpooled-string"
STAGING_NEXT_PUBLIC_STACK_PROJECT_ID="staging-project-id"
STAGING_NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="staging-key"
STAGING_STACK_SECRET_SERVER_KEY="staging-secret"
```

## Environment Configuration

### Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
ENABLE_NOTIFICATION_SCHEDULER=true

# Feature Flags (Optional - defaults to enabled)
FEATURE_PUSH_NOTIFICATIONS=true
FEATURE_BULK_OPERATIONS=true
FEATURE_ADVANCED_REPORTING=true
FEATURE_OFFLINE_MODE=true
FEATURE_SERVICE_WORKER=true
FEATURE_CACHING=true
FEATURE_BACKGROUND_SYNC=true
FEATURE_DARK_MODE=true
FEATURE_EXPERIMENTAL_UI=false
FEATURE_MOBILE_OPTIMIZATIONS=true
FEATURE_ADMIN_PANEL=true
FEATURE_USER_MANAGEMENT=true
FEATURE_SYSTEM_METRICS=true

# Emergency Controls
EMERGENCY_DISABLE_FEATURES=false  # Set to 'true' to disable non-essential features
```

### Database Configuration

1. **Create Production Database**: Set up Neon database with proper regions
2. **Configure Connection Pooling**: Use pooled connections for application queries
3. **Set up Branching**: Create development and staging branches
4. **Enable Point-in-Time Recovery**: Configure automatic backups

## Deployment Process

### Automatic Deployment (Recommended)

Deployments are triggered automatically via GitHub Actions:

1. **Push to main/master**: Triggers production deployment
2. **Push to development/staging**: Triggers staging deployment  
3. **Pull Requests**: Creates preview deployments

### Manual Deployment

For emergency deployments or troubleshooting:

```bash
# 1. Install dependencies
pnpm install

# 2. Run type checking and linting
pnpm typecheck
pnpm lint

# 3. Create database backup (production only)
pnpm db:backup

# 4. Run database migrations
pnpm db:migrate:prod

# 5. Build application
pnpm build

# 6. Deploy to Vercel
pnpm deploy:production
```

### Database Migration Process

Database migrations follow a strict process:

```bash
# 1. Create migration
pnpm db:generate

# 2. Test on staging
DATABASE_URL=$STAGING_DATABASE_URL pnpm db:migrate

# 3. Backup production
pnpm db:backup

# 4. Run production migration
pnpm db:migrate:prod

# 5. Verify migration
pnpm db:studio
```

## Health Checks

### Health Check Endpoints

- **Simple**: `GET /api/health` - Basic health status
- **Detailed**: `GET /api/health?type=detailed` - Comprehensive health report
- **Liveness**: `GET /api/health?type=liveness` - Kubernetes liveness probe
- **Readiness**: `GET /api/health?type=readiness` - Kubernetes readiness probe

### Health Check Parameters

```bash
# Query parameters
type=simple|liveness|readiness|detailed
format=json|text
cache=true|false
metrics=true|false

# Examples
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/health?type=detailed&cache=false
curl https://your-app.vercel.app/api/health?type=liveness&format=text
```

### Expected Health Check Responses

**Healthy Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "checks": {
    "database": true,
    "redis": true,
    "auth": true
  },
  "_metadata": {
    "responseTime": 45,
    "checkType": "simple"
  }
}
```

**Unhealthy Response (503)**:
```json
{
  "status": "unhealthy", 
  "timestamp": "2024-01-01T12:00:00Z",
  "checks": {
    "database": false,
    "redis": true,
    "auth": true
  },
  "issues": [
    "Database connection timeout"
  ]
}
```

## Monitoring & Observability

### Monitoring Endpoints

- **Metrics**: `GET /api/monitoring` - Application metrics and telemetry
- **Error Reporting**: `POST /api/monitoring` - Client-side error reports
- **Feature Flags**: `GET /api/feature-flags` - Current feature flag status

### Key Metrics to Monitor

1. **Performance Metrics**
   - Response time < 200ms (95th percentile)
   - Database query time < 100ms
   - Memory usage < 80%
   - Error rate < 1%

2. **Business Metrics**
   - User registrations per day
   - Medication administrations recorded
   - Active households
   - Push notification delivery rate

3. **System Metrics**
   - Health check success rate > 99%
   - Database connection pool usage
   - Feature flag adoption rates
   - Deployment frequency and success rate

### Error Tracking Integration

The application includes client-side error tracking:

```typescript
import { errorTracker } from '@/lib/monitoring/error-tracking';

// Manual error reporting
errorTracker.captureError(error, context, 'high');

// Custom message reporting  
errorTracker.captureMessage('Custom event', 'normal', context);
```

### External Monitoring Services

Consider integrating with:
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Infrastructure and application monitoring
- **Vercel Analytics**: Performance and usage analytics
- **Uptime monitoring**: Pingdom, StatusCake, or similar

## Feature Flags

### Feature Flag System

Feature flags allow runtime control of features without deployments:

```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

if (isFeatureEnabled('pushNotifications')) {
  // Enable push notifications
}
```

### Available Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `pushNotifications` | true | Push notification system |
| `bulkOperations` | true | Bulk medication operations |
| `advancedReporting` | true | Advanced analytics and reports |
| `offlineMode` | true | Offline functionality |
| `serviceWorker` | true | PWA service worker |
| `caching` | true | Application caching |
| `backgroundSync` | true | Background data synchronization |
| `darkMode` | true | Dark mode theme |
| `experimentalUI` | false | Experimental UI features |
| `mobileOptimizations` | true | Mobile-specific optimizations |
| `adminPanel` | true | Administrative interface |
| `userManagement` | true | User management features |
| `systemMetrics` | true | System metrics collection |

### Feature Flag Management

**Enable/Disable via Environment Variables**:
```bash
FEATURE_PUSH_NOTIFICATIONS=false
FEATURE_EXPERIMENTAL_UI=true
```

**Emergency Kill Switch**:
```bash
EMERGENCY_DISABLE_FEATURES=true  # Disables all non-essential features
```

## Rollback Procedures

### Automatic Rollback Triggers

Rollbacks are triggered automatically for:
- Health check failures after deployment
- Error rate spike > 5% for 5 minutes
- Critical performance degradation
- Failed database migrations

### Manual Rollback Process

Use the GitHub Actions rollback workflow:

1. **Go to GitHub Actions**
2. **Select "Rollback Production" workflow**
3. **Click "Run workflow"**
4. **Configure rollback parameters**:
   - Rollback type: `vercel_only`, `database_only`, or `full_rollback`
   - Target deployment (optional)
   - Database backup file (for database rollback)
   - Reason for rollback
   - Emergency mode (skip confirmations)

### Rollback Types

**Vercel Only** (`vercel_only`):
- Rolls back application deployment to previous version
- Database remains unchanged
- Fastest rollback option (< 30 seconds)

**Database Only** (`database_only`):
- Restores database from backup
- Application deployment unchanged
- Requires specified backup file

**Full Rollback** (`full_rollback`):
- Rolls back both application and database
- Most comprehensive but slowest option
- Creates pre-rollback backup for safety

### Manual Vercel Rollback

If GitHub Actions is unavailable:

```bash
# 1. List recent deployments
vercel ls --prod

# 2. Promote previous deployment
vercel promote <previous-deployment-url> --prod

# 3. Verify rollback
curl https://your-app.vercel.app/api/health
```

### Manual Database Rollback

```bash
# 1. Download backup
# (Implementation depends on backup storage)

# 2. Restore database
psql $DATABASE_URL_UNPOOLED < backup-file.sql

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT NOW();"
```

## Emergency Procedures

### Emergency Maintenance Mode

Enable maintenance mode during critical issues:

```bash
# Set emergency feature flag
EMERGENCY_DISABLE_FEATURES=true

# Or use Vercel environment variables
vercel env add EMERGENCY_DISABLE_FEATURES true production
```

### Emergency Rollback

For critical production issues:

1. **Immediate Action**: Run rollback workflow with `emergency=true`
2. **Communication**: Update status page and notify stakeholders
3. **Investigation**: Gather logs and error reports
4. **Resolution**: Fix issues in staging before redeployment

### Critical Issue Response

1. **Assess Severity**
   - Critical: Complete service down
   - High: Major feature broken
   - Medium: Minor feature issues

2. **Response Actions**
   - Critical: Immediate rollback + emergency mode
   - High: Rollback + investigation
   - Medium: Fix forward or scheduled rollback

3. **Communication Plan**
   - Notify on-call team
   - Update status page
   - Communicate with stakeholders
   - Post-mortem documentation

## Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check database connectivity
curl https://your-app.vercel.app/api/health?type=detailed

# Verify connection strings
echo $DATABASE_URL | sed 's/:[^@]*@/:****@/g'
```

**Authentication Issues**:
```bash
# Check Stack Auth configuration
curl https://your-app.vercel.app/api/feature-flags

# Verify environment variables are set
vercel env ls
```

**Performance Issues**:
```bash
# Check monitoring endpoint
curl https://your-app.vercel.app/api/monitoring

# Analyze build performance
pnpm build:analyze
```

**Feature Flag Issues**:
```bash
# Test feature flags endpoint
curl https://your-app.vercel.app/api/feature-flags

# Check environment variable configuration
vercel env ls | grep FEATURE_
```

### Log Analysis

**Vercel Function Logs**:
```bash
vercel logs --follow
```

**Database Logs** (Neon Console):
- Check slow query log
- Monitor connection pool usage
- Review error logs

**Error Tracking**:
- Monitor `/api/monitoring` for error reports
- Check browser console for client-side errors
- Review health check failure patterns

### Performance Debugging

1. **Response Time**: Target < 200ms 95th percentile
2. **Database Queries**: Target < 100ms average
3. **Memory Usage**: Target < 80% of available memory
4. **Error Rate**: Target < 1% of requests

### Recovery Procedures

**Service Recovery**:
1. Identify root cause via monitoring
2. Apply immediate fix or rollback
3. Verify service restoration
4. Monitor for 30 minutes post-recovery

**Data Recovery**:
1. Stop application traffic if needed
2. Restore from most recent backup
3. Validate data integrity
4. Resume application traffic
5. Monitor for data consistency issues

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code review completed
- [ ] Database migration tested on staging
- [ ] Feature flags configured appropriately
- [ ] Monitoring alerts configured
- [ ] Backup strategy verified

### During Deployment
- [ ] Database backup created
- [ ] Health checks passing
- [ ] Feature flags working
- [ ] Performance metrics within targets
- [ ] Error rates normal

### Post-Deployment
- [ ] Health checks stable for 30 minutes
- [ ] Key user journeys tested
- [ ] Monitoring dashboards reviewed
- [ ] Performance metrics confirmed
- [ ] Team notified of successful deployment

### Emergency Rollback Checklist
- [ ] Rollback reason documented
- [ ] Stakeholders notified
- [ ] Rollback type selected appropriately
- [ ] Pre-rollback backup created (if applicable)
- [ ] Rollback executed and verified
- [ ] Post-rollback health checks passing
- [ ] Incident documentation created

---

## Support Contacts

- **On-Call Engineer**: [Your escalation process]
- **Database Admin**: [Database support contact]
- **Infrastructure Team**: [Infrastructure support]
- **Product Team**: [Product stakeholder contacts]

## External Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Neon Database Docs](https://neon.tech/docs)
- [Stack Auth Documentation](https://docs.stack-auth.com)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)