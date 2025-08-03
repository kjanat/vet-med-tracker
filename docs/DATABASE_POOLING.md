# Database Connection Pooling

This document describes the connection pooling optimization implemented for the VetMed Tracker application.

## Overview

The application now uses Neon's pooled connection endpoints with intelligent connection management to improve performance and reliability.

## Implementation

### Connection Types

1. **Pooled Connection** (`dbPooled`): 
   - Uses Neon's `-pooler` endpoint suffix
   - Optimized for API routes and high-frequency operations
   - Automatically falls back to HTTP client if pooling unavailable

2. **Unpooled Connection** (`dbUnpooled`):
   - Direct connection to Neon without pooling
   - Used for migrations, batch operations, and long-running queries
   - Better for operations that need dedicated connections

3. **Standard Connection** (`db`):
   - HTTP-based connection for compatibility
   - Used as fallback when pooling is not available

### Connection Pool Configuration

```typescript
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,                    // Conservative limit for Neon free tier
  min: 0,                    // Serverless-friendly (no minimum)
  idleTimeoutMillis: 30000,  // 30 seconds
  connectionTimeoutMillis: 10000, // 10 seconds
  maxUses: 7500,             // Recycle connections
  allowExitOnIdle: true,     // Allow process to exit when idle
});
```

## Usage Guidelines

### For API Routes and tRPC
- Uses `dbPooled` automatically
- Optimized for short-lived queries
- Provides better performance for concurrent requests

### For Migrations and Scripts
- Uses `dbUnpooled` for migrations (`drizzle.config.ts`)
- Scripts use unpooled connections explicitly
- Better for long-running operations

### For Different Use Cases
Use the `getOptimalConnection()` helper:

```typescript
import { getOptimalConnection } from '@/db/drizzle';

// For API routes (default)
const db = getOptimalConnection('api');

// For migrations
const db = getOptimalConnection('migration');

// For batch operations  
const db = getOptimalConnection('batch');

// For transactions
const db = getOptimalConnection('transaction');
```

## Environment Variables

```bash
# Pooled connection (use for most operations)
DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/database?sslmode=require"

# Unpooled connection (for migrations and long-running operations)
DATABASE_URL_UNPOOLED="postgresql://user:password@host.region.aws.neon.tech/database?sslmode=require"
```

## Connection Lifecycle Management

### Graceful Shutdown
The application properly closes connections during shutdown:

```typescript
// Automatic cleanup on process signals
process.on('SIGTERM', closeConnections);
process.on('SIGINT', closeConnections);
```

### Error Handling
- Automatic fallback to HTTP client if pooling fails
- Connection recycling after maximum usage
- Monitoring and health checks in production

## Performance Benefits

1. **Reduced Connection Overhead**: Reuses existing connections
2. **Better Concurrency**: Handles multiple requests efficiently  
3. **Serverless Optimization**: No minimum connections maintained
4. **Automatic Scaling**: Adapts to load patterns
5. **Resource Management**: Prevents connection leaks

## Monitoring

The application includes database monitoring:
- Connection count tracking
- Response time monitoring
- Health status validation
- Alert system for production environments

## Backward Compatibility

All existing code continues to work without changes:
- Standard `db` import still available
- Type compatibility maintained
- Automatic fallback behavior
- No breaking changes to API