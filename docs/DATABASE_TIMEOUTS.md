# Database Statement Timeouts

This document explains the database timeout implementation for the VetMed Tracker application, designed to prevent zombie queries and optimize Neon free tier connection usage.

## Overview

The timeout system implements multiple layers of protection:

1. **AbortSignal-based timeouts** for fetch operations
2. **Promise-based timeouts** for general database operations  
3. **Statement timeouts** at the connection pool level
4. **Operation-specific timeout configurations** for different use cases

## Timeout Configuration

### Default Timeouts

| Operation Type | Timeout | Use Case |
|----------------|---------|----------|
| `READ` | 3 seconds | SELECT queries, lookups |
| `WRITE` | 5 seconds | INSERT, UPDATE, DELETE |
| `MIGRATION` | 30 seconds | Schema changes, migrations |
| `BATCH` | 15 seconds | Bulk operations |
| `HEALTH_CHECK` | 2 seconds | System health verification |
| `ANALYTICS` | 10 seconds | Complex queries, reporting |

### Configuration Location

Timeouts are configured in `/db/drizzle.ts`:

```typescript
export const TIMEOUT_CONFIG = {
  READ: 3000,      // 3 seconds
  WRITE: 5000,     // 5 seconds
  MIGRATION: 30000, // 30 seconds
  BATCH: 15000,    // 15 seconds
  HEALTH_CHECK: 2000, // 2 seconds
  ANALYTICS: 10000,   // 10 seconds
} as const;
```

## Usage Patterns

### 1. Using `timedOperations` (Recommended)

The simplest way to add timeouts to common operations:

```typescript
import { timedOperations } from '@/db/drizzle';

// Read operation with automatic 3-second timeout
const animals = await timedOperations.read(
  () => db.select().from(animals).limit(10),
  'fetch-animals'
);

// Write operation with automatic 5-second timeout
await timedOperations.write(
  () => db.insert(animals).values(newAnimal),
  'create-animal'
);
```

### 2. Using `executeWithTimeout`

For operations that need specific timeout types:

```typescript
import { executeWithTimeout } from '@/db/drizzle';

const result = await executeWithTimeout(
  () => db.select().from(animals),
  'READ',
  'operation-name'
);
```

### 3. Using `withDatabaseTimeout`

For custom timeout values:

```typescript
import { withDatabaseTimeout } from '@/db/drizzle';

const result = await withDatabaseTimeout(
  () => db.select().from(animals),
  {
    timeoutMs: 1000,  // Custom 1-second timeout
    operationName: 'quick-check'
  }
);
```

### 4. Using `tenantDb` with Timeouts

For tenant-scoped operations with timeout protection:

```typescript
import { tenantDb } from '@/db/drizzle';

const result = await tenantDb(
  householdId,
  (tx) => tx.select().from(animals),
  {
    operationType: 'READ',
    operationName: 'fetch-household-animals'
  }
);
```

## Implementation Details

### Neon Client Configuration

The Neon clients are configured with default timeouts:

```typescript
const neonConfig = {
  fetchConnectionCache: true,
  fetchOptions: {
    signal: createTimeoutSignal(TIMEOUT_CONFIG.READ),
  },
};

const sql = neon(DATABASE_URL, neonConfig);
```

### Connection Pool Configuration

The connection pool includes statement-level timeouts:

```typescript
_pool = new Pool({
  connectionString: DATABASE_URL,
  // ... other config
  statement_timeout: TIMEOUT_CONFIG.READ,  // 3 seconds
  query_timeout: TIMEOUT_CONFIG.WRITE,     // 5 seconds
});
```

### AbortSignal Support

The implementation includes fallback support for environments without native `AbortSignal.timeout`:

```typescript
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  
  // Fallback for older environments
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
```

## Error Handling

### DatabaseTimeoutError

Timeout errors are wrapped in a custom error class:

```typescript
export class DatabaseTimeoutError extends Error {
  constructor(
    message: string,
    public timeoutMs: number,
    public operation?: string,
  ) {
    super(message);
    this.name = "DatabaseTimeoutError";
  }
}
```

### Error Handling Pattern

```typescript
try {
  const result = await timedOperations.read(() => db.select().from(animals));
} catch (error) {
  if (error instanceof DatabaseTimeoutError) {
    console.error(`Operation timed out after ${error.timeoutMs}ms`);
    // Handle timeout specifically
  } else {
    console.error('Other database error:', error);
    // Handle other errors
  }
}
```

## Integration with Existing Systems

### Circuit Breaker Integration

Timeouts work seamlessly with the existing circuit breaker system:

```typescript
import { withCircuitBreaker } from '@/lib/circuit-breaker';
import { timedOperations } from '@/db/drizzle';

const result = await withCircuitBreaker(
  () => timedOperations.read(() => db.select().from(animals))
);
```

### Connection Queue Integration

Timeouts are applied within the connection queue system:

```typescript
import { withConnectionQueue } from '@/lib/connection-queue';
import { timedOperations } from '@/db/drizzle';

const result = await withConnectionQueue(
  () => timedOperations.read(() => db.select().from(animals))
);
```

## Best Practices

### 1. Choose Appropriate Timeout Types

- Use `READ` for SELECT queries and lookups
- Use `WRITE` for data modifications
- Use `HEALTH_CHECK` for system monitoring
- Use `ANALYTICS` for complex reporting queries
- Use `BATCH` for bulk operations
- Use `MIGRATION` for schema changes

### 2. Provide Operation Names

Always provide descriptive operation names for better debugging:

```typescript
await timedOperations.read(
  () => db.select().from(animals),
  'fetch-household-animals'  // Descriptive name
);
```

### 3. Handle Timeout Errors Gracefully

```typescript
try {
  const result = await timedOperations.read(operation);
} catch (error) {
  if (error instanceof DatabaseTimeoutError) {
    // Maybe return cached data or retry with longer timeout
    return await timedOperations.analytics(operation);
  }
  throw error;
}
```

### 4. Monitor Timeout Patterns

Log timeout errors to identify problematic queries:

```typescript
if (error instanceof DatabaseTimeoutError) {
  console.error('Timeout detected:', {
    operation: error.operation,
    timeout: error.timeoutMs,
    timestamp: new Date().toISOString()
  });
}
```

## Benefits

### 1. Connection Protection

- Prevents zombie queries from exhausting Neon connections
- Ensures rapid connection turnover for free tier limits
- Reduces risk of connection pool exhaustion

### 2. Predictable Performance

- Provides consistent response time expectations
- Prevents operations from hanging indefinitely
- Enables graceful degradation patterns

### 3. Resource Optimization

- Optimizes Neon free tier usage
- Reduces unnecessary resource consumption
- Enables better scaling patterns

### 4. Error Recovery

- Clear error signals for timeout scenarios
- Integration with existing error handling systems
- Enables fallback and retry strategies

## Monitoring and Observability

The timeout system integrates with existing monitoring:

- Timeout errors are logged with operation context
- Circuit breaker patterns detect timeout-related failures
- Connection queue monitoring includes timeout statistics
- Database health checks verify timeout configuration effectiveness

## Migration Guide

### Existing Code

To add timeouts to existing database operations:

**Before:**
```typescript
const animals = await db.select().from(animals);
```

**After:**
```typescript
const animals = await timedOperations.read(
  () => db.select().from(animals),
  'fetch-animals'
);
```

### Gradual Adoption

1. Start with critical operations (health checks, user-facing queries)
2. Add timeouts to batch operations
3. Migrate analytics and reporting queries
4. Update migration scripts

The timeout system is designed for backward compatibility, so existing code continues to work without timeouts until explicitly migrated.