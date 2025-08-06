# Rate Limiting System

A comprehensive rate limiting implementation using `@upstash/ratelimit` with sliding window rate limiting, multiple tiers, and tRPC middleware integration.

## Features

- **Sliding Window Rate Limiting**: Provides smooth rate limiting without burst behavior
- **Multiple Rate Limit Tiers**: Different limits for users, households, IPs, admins, and anonymous users
- **tRPC Middleware Integration**: Seamless integration with tRPC procedures
- **Admin Bypass**: Configurable bypass for admin operations
- **Rate Limit Headers**: Standard HTTP rate limit headers for API responses
- **Critical Operations**: Special handling for sensitive operations like medication administration
- **Analytics Support**: Built-in analytics for monitoring rate limit usage
- **IP Extraction**: Smart client IP detection from various proxy headers

## Rate Limit Tiers

| Tier | Requests | Window | Bypass Admins | Description |
|------|----------|--------|---------------|-------------|
| `user` | 1,000 | 1 minute | Yes | Per authenticated user |
| `household` | 5,000 | 1 minute | Yes | Per household operations |
| `ip` | 100 | 1 minute | No | Per IP address |
| `admin` | 10,000 | 1 minute | No | Admin operations (higher limits) |
| `authenticated` | 500 | 1 minute | Yes | General authenticated users |
| `anonymous` | 50 | 1 minute | No | Anonymous/unauthenticated users |

## Critical Operations

Special rate limits for sensitive operations:

| Operation | Requests | Window | Description |
|-----------|----------|--------|-------------|
| `administration` | 10 | 1 minute | Medication administration |
| `inventory` | 50 | 1 minute | Inventory updates |
| `user-creation` | 5 | 1 hour | User account creation |
| `password-reset` | 3 | 1 hour | Password reset attempts |

## Usage

### Basic Rate Limiting

```typescript
import { applyRateLimit } from '@/lib/redis/rate-limit';

// Apply user-specific rate limiting
const result = await applyRateLimit('user', userId, {
  isAdmin: false,
  bypassReason: undefined,
});

if (!result.success) {
  throw new Error(`Rate limited. Try again in ${result.retryAfter} seconds`);
}
```

### tRPC Middleware Integration

```typescript
import { createRateLimitMiddleware } from '@/lib/redis/rate-limit';

// Create rate limit middleware
const rateLimitMiddleware = createRateLimitMiddleware();

// Apply to tRPC procedures
export const rateLimitedProcedure = publicProcedure.use(rateLimitMiddleware);
export const rateLimitedProtectedProcedure = protectedProcedure.use(rateLimitMiddleware);

// Example usage in a router
export const userRouter = createTRPCRouter({
  getProfile: rateLimitedProtectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      // This endpoint will be rate limited
      return getUserProfile(input.userId);
    }),
});
```

### Critical Operations

```typescript
import { rateLimitCriticalOperation } from '@/lib/redis/rate-limit';

// Rate limit medication administration
const result = await rateLimitCriticalOperation(
  'administration',
  userId
);

if (!result.success) {
  throw new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: `Too many administration attempts. Try again in ${result.retryAfter} seconds.`
  });
}
```

### Rate Limit Headers

```typescript
import { generateRateLimitHeaders } from '@/lib/redis/rate-limit';

const result = await applyRateLimit('user', userId);
const headers = generateRateLimitHeaders(result);

// Headers include:
// X-RateLimit-Limit: "1000"
// X-RateLimit-Remaining: "999"
// X-RateLimit-Reset: "1640995200"
// X-RateLimit-Policy: "sliding-window"
// X-RateLimit-Retry-After: "60" (only when rate limited)
```

### Admin Operations

```typescript
// Bypass rate limits for admin users
const result = await applyRateLimit('user', userId, {
  isAdmin: true // Will bypass if tier allows admin bypass
});

// Or provide explicit bypass reason
const result = await applyRateLimit('user', userId, {
  bypassReason: 'system-maintenance'
});
```

## Advanced Features

### IP Address Detection

The system automatically detects client IP addresses from various proxy headers:

- `X-Forwarded-For` (takes first IP)
- `X-Real-IP`
- `CF-Connecting-IP` (Cloudflare)
- `X-Client-IP`

```typescript
import { extractClientIP } from '@/lib/redis/rate-limit';

const ip = extractClientIP(request.headers);
```

### Rate Limit Analytics

```typescript
import { getRateLimitAnalytics } from '@/lib/redis/rate-limit';

const analytics = await getRateLimitAnalytics('user', userId);
console.log('Current rate limit status:', analytics.current);
```

### Clearing Rate Limits

```typescript
import { clearRateLimit, bulkClearRateLimits } from '@/lib/redis/rate-limit';

// Clear single rate limit
await clearRateLimit('user', userId);

// Bulk clear multiple rate limits
await bulkClearRateLimits([
  { tier: 'user', identifier: 'user123' },
  { tier: 'ip', identifier: '192.168.1.1' }
]);
```

## Configuration

Rate limits are configured in the `RATE_LIMIT_CONFIGS` object:

```typescript
const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  user: {
    requests: 1000,
    windowMs: 60 * 1000,
    keyGenerator: (userId: string) => RedisKeys.rateLimit.user(userId),
    bypassAdmins: true,
  },
  // ... other tiers
};
```

## Error Handling

Rate limit failures throw `TRPCError` with code `TOO_MANY_REQUESTS`:

```typescript
try {
  await applyRateLimit('user', userId);
} catch (error) {
  if (error instanceof TRPCError && error.code === 'TOO_MANY_REQUESTS') {
    const rateLimitInfo = error.cause.rateLimitResult;
    console.log('Rate limited:', rateLimitInfo);
    console.log('Retry after:', rateLimitInfo.retryAfter);
  }
}
```

## Middleware Behavior

The tRPC middleware applies multiple rate limit checks based on context:

### Authenticated Users
1. **IP rate limiting** - Applied to all requests
2. **User rate limiting** - Per authenticated user
3. **Authenticated rate limiting** - General authenticated user limits
4. **Household rate limiting** - If household context is available
5. **Admin rate limiting** - If user is admin and path contains "admin" or "manage"

### Anonymous Users
1. **IP rate limiting** - Applied to all requests
2. **Anonymous rate limiting** - Very restrictive limits for unauthenticated users

### System Operations
Requests to paths starting with "health" or "system" are automatically bypassed.

## Redis Keys

The system uses namespaced Redis keys through the `RedisKeys.rateLimit` pattern:

```typescript
// Examples of generated keys:
// vetmed:dev:ratelimit:user:user123
// vetmed:prod:ratelimit:ip:192.168.1.1
// vetmed:dev:ratelimit:api:household:household456
```

## Testing

The system includes comprehensive tests covering all functionality. Run tests with:

```bash
pnpm test lib/redis/rate-limit.test.ts
```

## Monitoring

Rate limiting analytics are automatically enabled and can be monitored through:

1. **Redis Analytics** - Built into `@upstash/ratelimit`
2. **Custom Metrics** - Available through `getRateLimitAnalytics()`
3. **Error Logs** - All rate limit violations are logged

## Best Practices

1. **Choose Appropriate Tiers**: Use the most specific tier for your use case
2. **Monitor Usage**: Regularly check rate limit analytics to adjust limits
3. **Handle Gracefully**: Always provide user-friendly error messages
4. **Test Thoroughly**: Test rate limiting in development with realistic usage patterns
5. **Consider Business Logic**: Some operations may need custom rate limiting logic
6. **Admin Bypass**: Use admin bypass judiciously and log admin actions
7. **IP-based Limits**: Be careful with IP-based limits in shared network environments

## Troubleshooting

### Common Issues

1. **Rate Limits Too Low**: Monitor analytics and adjust `RATE_LIMIT_CONFIGS`
2. **Redis Connection**: Check Redis health with `checkRedisHealth()`
3. **IP Detection**: Verify proxy headers are correctly configured
4. **Bypass Not Working**: Check admin role detection and tier configuration
5. **Tests Failing**: Ensure Redis test instance is available

### Debugging

Enable verbose logging by setting environment variables:

```bash
DEBUG=rate-limit:* npm start
```

Check Redis connection:

```typescript
import { checkRedisHealth } from '@/lib/redis/client';

const health = await checkRedisHealth();
console.log('Redis health:', health);
```