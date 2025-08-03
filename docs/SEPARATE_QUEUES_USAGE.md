# Separate Read/Write Connection Queues

This document explains how to use the new separate read/write connection queues in the VetMed Tracker application.

## Overview

The connection queue system has been enhanced to provide separate queues for different operation types, optimizing database connection usage for Neon's connection limits:

- **Read Queue**: Higher concurrency (8 connections) for SELECT operations
- **Write Queue**: Lower concurrency (3 connections) for INSERT/UPDATE/DELETE operations  
- **Batch Queue**: Single connection for bulk operations
- **Critical Queue**: Dedicated slots (2 connections) for health checks and critical operations

## Queue Configuration

```typescript
export const connectionQueues = {
  read: new ConnectionQueue({
    maxConcurrentConnections: 8,  // Higher for reads
    maxQueueSize: 300,
    timeoutMs: 20000,             // Shorter timeout for reads
  }),
  
  write: new ConnectionQueue({
    maxConcurrentConnections: 3,  // Conservative for writes
    maxQueueSize: 150,
    timeoutMs: 45000,             // Longer timeout for writes
  }),
  
  batch: new ConnectionQueue({
    maxConcurrentConnections: 1,  // Single connection for batches
    maxQueueSize: 50,
    timeoutMs: 120000,            // 2 minutes for batch operations
  }),
  
  critical: new ConnectionQueue({
    maxConcurrentConnections: 2,  // Dedicated slots for critical ops
    maxQueueSize: 20,
    timeoutMs: 10000,             // Fast fail for critical ops
  }),
};
```

## Usage Examples

### Basic Usage with Operation Type

```typescript
import { withConnectionQueue } from "@/lib/connection-queue";

// Read operation (default)
const users = await withConnectionQueue(
  () => db.user.findMany(),
  QUEUE_PRIORITIES.NORMAL,
  "get-users",
  "read"  // Operation type
);

// Write operation
const newUser = await withConnectionQueue(
  () => db.user.create({ data: userData }),
  QUEUE_PRIORITIES.HIGH,
  "create-user", 
  "write"  // Operation type
);
```

### Convenience Functions

```typescript
import { 
  withReadQueue, 
  withWriteQueue, 
  withBatchQueue, 
  withCriticalQueue 
} from "@/lib/connection-queue";

// Read operations
const animals = await withReadQueue(
  () => db.animal.findMany({ where: { householdId } })
);

// Write operations  
const administration = await withWriteQueue(
  () => db.administration.create({ data: adminData }),
  QUEUE_PRIORITIES.HIGH
);

// Batch operations
await withBatchQueue(
  () => db.administration.createMany({ data: batchData })
);

// Critical operations (health checks)
const health = await withCriticalQueue(
  () => db.$queryRaw`SELECT 1`
);
```

### tRPC Middleware Integration

```typescript
import { createConnectionQueueMiddleware } from "@/lib/connection-queue";

// Create middleware for specific operation types
const readMiddleware = createConnectionQueueMiddleware(
  QUEUE_PRIORITIES.NORMAL, 
  "read"
);

const writeMiddleware = createConnectionQueueMiddleware(
  QUEUE_PRIORITIES.HIGH, 
  "write"
);

// Use in tRPC procedures
export const animalRouter = router({
  list: publicProcedure
    .use(readMiddleware)  // Use read queue
    .query(async ({ ctx }) => {
      return ctx.db.animal.findMany();
    }),
    
  create: publicProcedure
    .use(writeMiddleware) // Use write queue
    .input(createAnimalSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.animal.create({ data: input });
    }),
});
```

### Connection Middleware Integration

The connection middleware automatically routes operations to the appropriate queue based on the `operationType` in the context:

```typescript
import { withDatabaseSafeguards } from "@/lib/connection-middleware";

// The middleware will automatically use the read queue
const result = await withDatabaseSafeguards(
  () => db.user.findMany(),
  { 
    operationType: "read",  // Routes to read queue
    priority: QUEUE_PRIORITIES.NORMAL 
  }
);

// The middleware will automatically use the write queue
const newRecord = await withDatabaseSafeguards(
  () => db.administration.create({ data }),
  { 
    operationType: "write", // Routes to write queue
    priority: QUEUE_PRIORITIES.HIGH 
  }
);
```

## Health Monitoring

The health endpoint now provides statistics for all queues:

```typescript
// GET /api/health?detailed=true returns:
{
  "queueStatus": {
    "healthy": true,
    "stats": {
      "read": {
        "activeConnections": 2,
        "queuedItems": 0,
        "totalProcessed": 150,
        "totalFailed": 0,
        "averageWaitTime": 45,
        "averageExecutionTime": 120
      },
      "write": {
        "activeConnections": 1,
        "queuedItems": 3,
        "totalProcessed": 50,
        "totalFailed": 0,
        "averageWaitTime": 180,
        "averageExecutionTime": 250
      },
      "batch": {
        "activeConnections": 0,
        "queuedItems": 0,
        "totalProcessed": 5,
        "totalFailed": 0,
        "averageWaitTime": 500,
        "averageExecutionTime": 2000
      },
      "critical": {
        "activeConnections": 0,
        "queuedItems": 0,
        "totalProcessed": 20,
        "totalFailed": 0,
        "averageWaitTime": 10,
        "averageExecutionTime": 50
      }
    },
    "overallStats": {
      "totalActive": 3,
      "totalQueued": 3,
      "totalProcessed": 225,
      "totalFailed": 0
    }
  }
}
```

## Queue Management

```typescript
import { 
  getAllQueueStats,
  areAllQueuesHealthy,
  clearAllQueues,
  pauseAllQueues,
  resumeAllQueues
} from "@/lib/connection-queue";

// Get stats for all queues
const stats = getAllQueueStats();

// Check overall health
const healthy = areAllQueuesHealthy();

// Emergency controls
pauseAllQueues();   // Pause all operations
resumeAllQueues();  // Resume all operations
clearAllQueues();   // Clear all queued operations
```

## Migration from Single Queue

### Before (Single Queue)
```typescript
import { withConnectionQueue } from "@/lib/connection-queue";

const result = await withConnectionQueue(
  () => db.user.findMany(),
  QUEUE_PRIORITIES.NORMAL
);
```

### After (Separate Queues)
```typescript
import { withReadQueue } from "@/lib/connection-queue";

const result = await withReadQueue(
  () => db.user.findMany(),
  QUEUE_PRIORITIES.NORMAL
);

// Or explicitly specify operation type
import { withConnectionQueue } from "@/lib/connection-queue";

const result = await withConnectionQueue(
  () => db.user.findMany(),
  QUEUE_PRIORITIES.NORMAL,
  "get-users",
  "read"  // Add operation type
);
```

## Backward Compatibility

The original `withConnectionQueue` function still works but defaults to the read queue. For new code, it's recommended to use the specific queue functions or specify the operation type explicitly.

## Best Practices

1. **Use appropriate queues**: Use read queue for SELECT operations, write queue for mutations
2. **Set proper priorities**: Use higher priorities for user-facing operations
3. **Monitor queue health**: Check queue statistics in health endpoints
4. **Handle queue capacity**: Implement proper error handling for queue capacity errors
5. **Use batch queue sparingly**: Reserve batch queue for large bulk operations
6. **Critical queue for health**: Use critical queue only for health checks and system operations

## Performance Benefits

- **Prevents write blocking reads**: Read operations can proceed even when writes are queued
- **Optimized for Neon limits**: Each queue type is configured for optimal Neon performance  
- **Better resource utilization**: Separate queues allow for more efficient connection usage
- **Improved responsiveness**: User-facing reads aren't blocked by heavy write operations