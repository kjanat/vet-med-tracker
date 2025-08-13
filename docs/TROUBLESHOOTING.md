# Troubleshooting Guide

Common issues and solutions for VetMed Tracker.

## Table of Contents

- [Development Issues](#development-issues)
- [Build & Deployment Issues](#build--deployment-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)
- [Browser & PWA Issues](#browser--pwa-issues)

## Development Issues

### Issue: Dev server won't start

**Error**: `Port 3000 is already in use`

**Solution**:

```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

### Issue: Module not found errors

**Error**: `Cannot find module '@/...'`

**Solution**:

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install --frozen-lockfile
pnpm dev
```

### Issue: TypeScript errors blocking development

**Current Status**: TypeScript errors are ignored in build but shown in development.

**Solution**:

```bash
# Continue development despite TS errors
pnpm dev

# To check types without blocking
pnpm typecheck || true
```

### Issue: Hot reload not working

**Solution**:

```bash
# Try Turbopack (experimental but faster)
pnpm dev:turbo

# Or clear Next.js cache
rm -rf .next
pnpm dev
```

## Build & Deployment Issues

### Issue: Build fails with memory error

**Error**: `JavaScript heap out of memory`

**Solution**:

```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" pnpm build

# Or add to package.json scripts
"build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
```

### Issue: Vercel deployment fails

**Common causes and solutions**:

1. **Environment variables missing**
    - Check all required env vars in Vercel dashboard
    - Ensure DATABASE_URL is properly formatted

2. **Build timeout**
    - Optimize build by excluding unnecessary files (.vercelignore)
    - Increase function timeout in vercel.json

3. **Function size limit exceeded**
   ```json
   // vercel.json - Optimize functions
   {
     "functions": {
       "app/api/**/*.ts": {
         "maxDuration": 30,
         "memory": 1024
       }
     }
   }
   ```

### Issue: TypeScript build errors

**Note**: Build is configured to ignore TS errors.

**To fix anyway**:

```bash
# Check specific errors
pnpm typecheck

# Common fixes:
# 1. Update type definitions
pnpm add -D @types/node@latest

# 2. Clear TypeScript cache
rm -rf node_modules/.cache/typescript
```

## Database Issues

### Issue: Database connection timeout

**Error**: `CONNECT_TIMEOUT localhost:5432`

**Solution**:

1. **Local PostgreSQL not running**:

```bash
# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

2. **Using Neon/Cloud database**:

```bash
# Update .env.local with correct URL
DATABASE_URL=postgresql://user:pass@host.neon.tech/db
DATABASE_URL_UNPOOLED=postgresql://user:pass@host.neon.tech/db?pool=false
```

3. **Connection pool exhausted**:

```typescript
// Check db/drizzle.ts settings
max: 5,  // Reduce for free tier
idleTimeoutMillis: 30000
```

### Issue: Migration fails

**Solution**:

```bash
# Reset and retry
pnpm db:push --force

# Or manually connect
psql $DATABASE_URL
\i migrations/0001_init.sql
```

### Issue: Test database not working

**Solution**:

```bash
# Tests don't require database for unit tests
pnpm test:unit

# For integration tests, use Docker
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres \
  postgres:15
```

## Authentication Issues

### Issue: Stack Auth not working

**Common fixes**:

1. **Check environment variables**:

```env
NEXT_PUBLIC_STACK_PROJECT_ID=must-be-correct
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=must-be-correct
STACK_SECRET_SERVER_KEY=must-be-correct
```

2. **Clear auth cookies**:

```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
});
```

3. **Verify Stack Auth project settings**:
    - Check allowed URLs in Stack dashboard
    - Ensure OAuth providers are configured

### Issue: User sync failing

**Solution**:

```bash
# Check webhook configuration
curl -X POST http://localhost:3000/api/webhooks/stack \
  -H "Content-Type: application/json" \
  -d '{"type": "user.created", "data": {...}}'
```

## Performance Issues

### Issue: Slow page loads

**Diagnosis**:

```bash
# Run Lighthouse
pnpm lighthouse

# Check bundle size
pnpm build:analyze
```

**Solutions**:

1. **Enable caching**:
    - Vercel automatically caches static assets
    - Check Cache-Control headers in vercel.json

2. **Optimize images** (currently disabled for PWA):

```javascript
// To re-enable if needed
module.exports = {
  images: {
    unoptimized: false  // Change to false
  }
}
```

3. **Use production build locally**:

```bash
pnpm build
pnpm start
```

### Issue: High memory usage

**Solution**:

```javascript
// Reduce connection pool size in db/drizzle.ts
max: 3,  // Reduce from 5
idleTimeoutMillis: 15000  // Reduce from 30000
```

## Testing Issues

### Issue: Tests not running

**Error**: `No test files found`

**Solution**:

```bash
# Use unit test config
pnpm test:unit

# Run specific test file
pnpm vitest run tests/unit/utils/dates.test.ts
```

### Issue: Coverage report shows 0%

**Current limitation**: Tests run but coverage reporting needs fix.

**Workaround**:

```bash
# Run tests without coverage
pnpm test:unit

# Check test output for pass/fail
```

### Issue: E2E tests failing

**Solution**:

```bash
# Install Playwright browsers
pnpm exec playwright install

# Run with UI for debugging
pnpm test:e2e:ui
```

## Browser & PWA Issues

### Issue: PWA not installing

**Checklist**:

1. Using HTTPS (required for PWA)
2. manifest.json accessible at /manifest.json
3. Service worker at /sw.js
4. Valid icons in public/icons/

**Debug**:

```javascript
// Browser console
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('Service Workers:', regs));
```

### Issue: Offline mode not working

**Solution**:

1. Check service worker registration
2. Clear browser cache and re-register
3. Verify IndexedDB is not blocked

```javascript
// Force service worker update
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister();
  window.location.reload();
});
```

### Issue: Time zone issues

**Solution**:

```typescript
// Animals have individual timezones
// Check animal settings
const animal = await trpc.animal.get.query({ id });
console.log('Animal timezone:', animal.timezone);

// Update if needed
await trpc.animal.update.mutate({
  id,
  timezone: 'America/New_York'
});
```

## Common Error Messages

### `Module not found: Can't resolve '@/...'`

- Run `pnpm install`
- Check tsconfig.json paths

### `ECONNREFUSED 127.0.0.1:5432`

- PostgreSQL not running
- Wrong DATABASE_URL

### `Invalid environment variables`

- Check .env.local formatting
- No spaces around `=`
- No quotes unless containing spaces

### `Hydration failed`

- Client/server mismatch
- Check date formatting and timezones
- Clear browser cache

### `Too many connections`

- Database connection limit reached
- Reduce pool size in db/drizzle.ts
- Check for connection leaks

## Getting Help

If issues persist:

1. **Check logs**:

```bash
# Development logs
pnpm dev --verbose

# Production logs (Vercel)
vercel logs --prod
```

2. **Enable debug mode**:

```env
# .env.local
DEBUG=* 
```

3. **Search existing issues**:
    - GitHub Issues
    - Stack Overflow

4. **Create detailed bug report**:
    - Error message
    - Steps to reproduce
    - Environment (OS, Node version, browser)
    - Relevant logs

5. **Contact support**:
    - Open GitHub issue
    - Include troubleshooting steps tried