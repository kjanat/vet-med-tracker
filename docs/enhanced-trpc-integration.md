# Enhanced tRPC Integration Guide

This document provides comprehensive guidance on using the enhanced tRPC infrastructure with all available features including rate limiting, circuit breakers, logging, caching, and input sanitization.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Infrastructure Components](#infrastructure-components)
3. [Enhanced Procedures](#enhanced-procedures)
4. [Usage Patterns](#usage-patterns)
5. [Configuration](#configuration)
6. [Monitoring and Debugging](#monitoring-and-debugging)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Basic Usage

```typescript
// Import the enhanced procedures
import { 
  createTRPCRouter, 
  enhancedProtectedProcedure,
  enhancedHouseholdProcedure,
  enhancedOwnerProcedure,
  criticalOperationProcedure
} from "@/server/api/trpc/enhanced-init";

// Create a router with enhanced features
export const myRouter = createTRPCRouter({
  // Basic protected endpoint with logging and sanitization
  getProfile: enhancedProtectedProcedure
    .query(async ({ ctx }) => {
      // Context includes all infrastructure components
      await ctx.logger.info("Profile requested", {}, ctx.correlationId);
      
      return {
        user: ctx.dbUser,
        timestamp: new Date(),
      };
    }),

  // Household-scoped endpoint with caching
  getAnimals: enhancedHouseholdProcedure
    .query(async ({ ctx }) => {
      // Automatic caching, rate limiting, and sanitization applied
      return withEnhancedDatabaseOperation(
        ctx,
        "select",
        "animals",
        async () => {
          return ctx.db.query.animals.findMany({
            where: eq(animals.householdId, ctx.householdId),
          });
        }
      );
    }),
});
```

### Advanced Usage with Full Features

```typescript
export const advancedRouter = createTRPCRouter({
  // Critical operation with enhanced protections
  recordMedication: criticalOperationProcedure
    .input(z.object({
      animalId: z.string().uuid(),
      medicationId: z.string().uuid(),
      dosage: z.string().max(50),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Input is automatically sanitized
      const sanitizedInput = {
        ...input,
        dosage: ctx.medicalSanitizer.sanitizeDosage(input.dosage),
        notes: input.notes ? ctx.medicalSanitizer.sanitizeNotes(input.notes) : undefined,
      };

      // Database operation with circuit breaker protection
      const result = await withEnhancedDatabaseOperation(
        ctx,
        "insert",
        "administrations",
        async () => {
          return ctx.db.insert(administrations).values({
            id: crypto.randomUUID(),
            animalId: sanitizedInput.animalId,
            medicationId: sanitizedInput.medicationId,
            dosage: sanitizedInput.dosage,
            notes: sanitizedInput.notes,
            administeredAt: new Date(),
            administeredBy: ctx.auth.userId,
          }).returning();
        }
      );

      // Audit logging is automatic for critical operations
      // Cache invalidation
      await ctx.animalCache.invalidateAnimal(input.animalId);
      
      return { success: true, administration: result[0] };
    }),
});
```

## Infrastructure Components

### 1. Rate Limiting

Automatic rate limiting is applied based on user tier and operation type:

```typescript
// Rate limits are automatically applied based on:
// - User tier (anonymous, authenticated, user, household, admin)
// - Operation type (read, write, critical)
// - Endpoint path

// Custom rate limiting for critical operations
const rateLimitResult = await rateLimitCriticalOperation(
  "administration",
  ctx.auth.userId,
  { isAdmin: ctx.membership?.role === "OWNER" }
);

if (!rateLimitResult.success) {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
  });
}
```

**Rate Limit Tiers:**
- Anonymous: 50 requests/minute
- Authenticated: 500 requests/minute
- User-specific: 1000 requests/minute
- Household: 5000 requests/minute
- Admin: 10000 requests/minute

**Critical Operation Limits:**
- Administration: 10 requests/minute
- Inventory: 50 requests/minute
- User creation: 5 requests/hour
- Password reset: 3 requests/hour

### 2. Circuit Breakers

Automatic circuit breaker protection for database operations:

```typescript
// Circuit breakers are automatically applied
// Manual usage for specific operations
const result = await withCircuitBreaker(
  async () => {
    return performDatabaseOperation();
  },
  databaseCircuitBreaker,
  // Fallback function
  () => {
    return getCachedData() || getDefaultData();
  }
);
```

**Circuit Breaker Types:**
- **Primary**: 5 failures → 30s timeout (general operations)
- **Critical**: 3 failures → 10s timeout (health checks)
- **Batch**: 10 failures → 60s timeout (bulk operations)
- **Analytics**: 8 failures → 45s timeout (reports)

### 3. Structured Logging

Comprehensive logging with correlation IDs:

```typescript
// Logging is automatic, but can be used manually
await ctx.logger.info("Operation started", {
  operation: "medication-record",
  animalId: input.animalId,
}, ctx.correlationId);

await ctx.logger.error("Operation failed", error, {
  operation: "medication-record",
  animalId: input.animalId,
}, ctx.correlationId);

// Performance tracking
const tracker = ctx.performanceTracker;
const metrics = tracker.getMetrics();
console.log(`Operation took ${metrics.duration}ms`);
```

**Log Levels:**
- `debug`: Detailed debugging information
- `info`: General operational messages
- `warn`: Warning conditions
- `error`: Error conditions with stack traces

### 4. Caching

Multi-level caching with Redis:

```typescript
// Cache usage
const cachedData = await ctx.cache.get<AnimalData>(`animal:${animalId}`);
if (!cachedData) {
  const freshData = await fetchAnimalData(animalId);
  await ctx.cache.set(`animal:${animalId}`, freshData, { 
    ttl: 300, // 5 minutes
    staleOnError: true 
  });
  return freshData;
}

// Domain-specific caches
await ctx.householdCache.setHousehold(householdId, data);
await ctx.animalCache.invalidateAnimal(animalId);
```

**Cache Types:**
- **General**: 5-minute TTL, general data
- **Household**: 10-minute TTL, household-specific data
- **Animal**: 10-minute TTL, animal-specific data
- **Pending Meds**: 1-minute TTL, real-time medication data

### 5. Input Sanitization

Automatic input sanitization for security:

```typescript
// Automatic sanitization is applied to all inputs
// Manual sanitization for specific fields
const sanitizedInput = {
  animalName: ctx.medicalSanitizer.sanitizeAnimalName(input.name),
  medicationName: ctx.medicalSanitizer.sanitizeMedicationName(input.medication),
  dosage: ctx.medicalSanitizer.sanitizeDosage(input.dosage),
  notes: ctx.medicalSanitizer.sanitizeNotes(input.notes),
  email: ctx.medicalSanitizer.sanitizeEmail(input.email),
  phone: ctx.medicalSanitizer.sanitizePhoneNumber(input.phone),
};

// Object-level sanitization
const cleanInput = ctx.sanitizer.sanitizeObject(input, {
  fieldRules: {
    animalName: (value) => ctx.medicalSanitizer.sanitizeAnimalName(value),
    notes: (value) => ctx.medicalSanitizer.sanitizeNotes(value),
  }
});
```

**Sanitization Features:**
- SQL injection prevention
- XSS protection
- Domain-specific sanitization (medical data)
- File upload validation
- Request size limiting

### 6. Audit Logging

Comprehensive audit trails for compliance:

```typescript
// Automatic audit logging for critical operations
// Manual audit logging
await auditLogger.logDataEvent({
  event: "medication_administered",
  userId: ctx.auth.userId,
  householdId: ctx.householdId,
  resourceId: administrationId,
  resourceType: "administration",
  details: {
    animalId: input.animalId,
    medicationId: input.medicationId,
    administeredBy: ctx.auth.userId,
  },
  correlationId: ctx.correlationId,
  severity: "high",
});

await auditLogger.logSecurityEvent({
  event: "unauthorized_access_attempt",
  userId: ctx.auth.userId,
  resource: "owner-only-endpoint",
  details: { attemptedRole: ctx.membership.role },
  severity: "high",
  correlationId: ctx.correlationId,
});
```

## Enhanced Procedures

### 1. Basic Protected Procedure

```typescript
enhancedProtectedProcedure
```

**Features:**
- User authentication required
- Rate limiting applied
- Input sanitization
- Structured logging
- Performance monitoring

### 2. Household Procedure

```typescript
enhancedHouseholdProcedure
```

**Features:**
- All basic features plus:
- Household membership validation
- Automatic caching with household context
- Household-specific rate limits

### 3. Owner Procedure

```typescript
enhancedOwnerProcedure
```

**Features:**
- All household features plus:
- Owner role validation
- Comprehensive audit logging
- Security event monitoring

### 4. Critical Operation Procedure

```typescript
criticalOperationProcedure
```

**Features:**
- All protected features plus:
- Enhanced rate limiting
- Critical circuit breaker
- Mandatory audit logging
- Failure fallbacks

### 5. Cached Query Procedure

```typescript
createCachedQueryProcedure({
  keyGenerator: (input, ctx) => `cache-key-${input.id}`,
  ttl: 300,
  staleOnError: true,
})
```

**Features:**
- Automatic response caching
- Stale data fallback
- Cache invalidation patterns
- Performance optimization

## Usage Patterns

### 1. Simple CRUD Operations

```typescript
export const crudRouter = createTRPCRouter({
  // Read operation with caching
  getById: enhancedHouseholdProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.cache.getOrSet(
        `item:${input.id}`,
        () => withEnhancedDatabaseOperation(
          ctx,
          "select",
          "items",
          () => ctx.db.query.items.findFirst({
            where: eq(items.id, input.id)
          })
        ),
        { ttl: 300, staleOnError: true }
      );
    }),

  // Create operation with audit logging
  create: enhancedHouseholdProcedure
    .input(CreateItemSchema)
    .mutation(async ({ ctx, input }) => {
      const sanitizedInput = ctx.sanitizer.sanitizeObject(input);
      
      const newItem = await withEnhancedDatabaseOperation(
        ctx,
        "insert",
        "items",
        async () => {
          const [item] = await ctx.db.insert(items)
            .values({ ...sanitizedInput, id: crypto.randomUUID() })
            .returning();
          return item;
        }
      );

      await ctx.cache.delete(`items:household:${ctx.householdId}`);
      return newItem;
    }),
});
```

### 2. Complex Business Logic

```typescript
export const businessRouter = createTRPCRouter({
  processComplexOperation: criticalOperationProcedure
    .input(ComplexOperationSchema)
    .mutation(async ({ ctx, input }) => {
      // Rate limiting for complex operations
      const rateLimitResult = await rateLimitCriticalOperation(
        "inventory",
        ctx.auth.userId
      );
      
      if (!rateLimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Complex operation rate limited"
        });
      }

      // Transaction with circuit breaker
      const result = await withCircuitBreaker(
        async () => {
          return ctx.db.transaction(async (tx) => {
            // Step 1: Validation
            const validationResult = await validateOperation(tx, input);
            if (!validationResult.valid) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: validationResult.error
              });
            }

            // Step 2: Business logic
            const businessResult = await performBusinessLogic(tx, input);
            
            // Step 3: Side effects
            await updateRelatedData(tx, businessResult);
            
            return businessResult;
          });
        },
        databaseCircuitBreaker,
        // Fallback for complex operations
        () => {
          throw new TRPCError({
            code: "SERVICE_UNAVAILABLE",
            message: "Service temporarily unavailable"
          });
        }
      );

      // Cache invalidation
      await invalidateRelatedCaches(ctx, result);
      
      return result;
    }),
});
```

### 3. High-Performance Queries

```typescript
const highPerformanceQueryProcedure = createCachedQueryProcedure({
  keyGenerator: (input: { filters: any }, ctx) => 
    `query:${ctx.householdId}:${JSON.stringify(input.filters)}`,
  ttl: 600, // 10 minutes
  staleOnError: true,
});

export const performanceRouter = createTRPCRouter({
  expensiveQuery: highPerformanceQueryProcedure
    .input(z.object({
      filters: z.object({
        dateRange: z.object({
          start: z.date(),
          end: z.date(),
        }),
        animalIds: z.array(z.string().uuid()).optional(),
      }),
    }))
    .query(async ({ ctx, input }) => {
      // This query result will be automatically cached
      return withEnhancedDatabaseOperation(
        ctx,
        "select",
        "complex_query",
        async () => {
          return ctx.db.execute({
            sql: `
              WITH medication_stats AS (
                SELECT 
                  a.id,
                  a.name,
                  COUNT(ad.id) as total_administrations,
                  AVG(EXTRACT(EPOCH FROM (ad.administered_at - ad.scheduled_at))) as avg_delay
                FROM animals a
                LEFT JOIN administrations ad ON a.id = ad.animal_id
                WHERE a.household_id = $1
                  AND ad.administered_at BETWEEN $2 AND $3
                  ${input.filters.animalIds ? 'AND a.id = ANY($4)' : ''}
                GROUP BY a.id, a.name
              )
              SELECT * FROM medication_stats
              ORDER BY total_administrations DESC
            `,
            values: [
              ctx.householdId,
              input.filters.dateRange.start,
              input.filters.dateRange.end,
              ...(input.filters.animalIds || [])
            ]
          });
        }
      );
    }),
});
```

### 4. File Upload Operations

```typescript
export const uploadRouter = createTRPCRouter({
  uploadAnimalPhoto: enhancedHouseholdProcedure
    .input(z.object({
      animalId: z.string().uuid(),
      file: z.object({
        name: z.string(),
        type: z.string(),
        size: z.number(),
        content: z.string(), // base64
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate file upload
      const validation = FileUploadValidator.validateImage({
        name: input.file.name,
        type: input.file.type,
        size: input.file.size,
      });
      
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error,
        });
      }

      // Rate limit file uploads
      const rateLimitResult = await applyRateLimit(
        "user",
        ctx.auth.userId,
        { customKey: `upload:${ctx.auth.userId}` }
      );
      
      if (!rateLimitResult.success) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Upload rate limit exceeded"
        });
      }

      // Process upload
      const uploadResult = await processFileUpload(input.file);
      
      // Update animal record
      await withEnhancedDatabaseOperation(
        ctx,
        "update",
        "animals",
        async () => {
          return ctx.db.update(animals)
            .set({ 
              photoUrl: uploadResult.url,
              updatedAt: new Date(),
            })
            .where(eq(animals.id, input.animalId));
        }
      );

      // Invalidate cache
      await ctx.animalCache.invalidateAnimal(input.animalId);
      
      return {
        success: true,
        photoUrl: uploadResult.url,
      };
    }),
});
```

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_ADMIN=true

# Circuit Breakers
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=30000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_PERFORMANCE_LOGGING=true

# Caching
CACHE_DEFAULT_TTL=300
CACHE_ENABLE_STALE_ON_ERROR=true
```

### tRPC Configuration

```typescript
// Customize middleware configuration
const customLoggingMiddleware = createTRPCLoggingMiddleware({
  logRequests: process.env.NODE_ENV === "development",
  logResponses: false,
  logErrors: true,
  logPerformance: true,
  excludePaths: ["/health", "/ping"],
  maxPayloadSize: 1000,
  sensitiveInputs: ["password", "token", "secret", "apiKey"],
});

const customRateLimitMiddleware = createRateLimitMiddleware<EnhancedTRPCContext>({
  // Custom rate limiting configuration
});
```

## Monitoring and Debugging

### 1. Health Check Endpoint

```typescript
export const healthRouter = createTRPCRouter({
  check: publicProcedure
    .query(async ({ ctx }) => {
      const checks = await Promise.allSettled([
        // Database check
        ctx.db.execute({ sql: "SELECT 1" }),
        
        // Cache check
        ctx.cache.set("health", "ok", { ttl: 10 }),
        
        // Circuit breaker status
        Promise.resolve(databaseCircuitBreaker.getMetrics()),
      ]);

      return {
        healthy: checks.every(check => check.status === "fulfilled"),
        timestamp: new Date().toISOString(),
        checks: {
          database: checks[0].status === "fulfilled",
          cache: checks[1].status === "fulfilled",
          circuitBreaker: checks[2].status === "fulfilled" 
            ? (checks[2].value as any).state === "CLOSED"
            : false,
        },
      };
    }),
});
```

### 2. Performance Monitoring

```typescript
// Built-in performance tracking
export const monitoringRouter = createTRPCRouter({
  getPerformanceMetrics: enhancedProtectedProcedure
    .query(async ({ ctx }) => {
      const metrics = ctx.performanceTracker.getMetrics();
      
      return {
        currentRequest: {
          duration: metrics.duration,
          memoryUsage: metrics.memoryUsed,
        },
        circuitBreakers: {
          database: databaseCircuitBreaker.getMetrics(),
          critical: criticalCircuitBreaker.getMetrics(),
        },
      };
    }),
});
```

### 3. Debug Information

```typescript
// Debug endpoint (development only)
export const debugRouter = createTRPCRouter({
  getDebugInfo: enhancedProtectedProcedure
    .query(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "development") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Debug endpoint only available in development",
        });
      }

      return {
        context: {
          userId: ctx.auth.userId,
          householdId: ctx.currentHouseholdId,
          correlationId: ctx.correlationId,
          requestId: ctx.requestId,
        },
        performance: ctx.performanceTracker.getMetrics(),
        cacheStats: {
          // Cache hit rates, etc.
        },
        rateLimitStatus: {
          // Current rate limit status
        },
      };
    }),
});
```

## Best Practices

### 1. Input Validation and Sanitization

```typescript
// Always define comprehensive input schemas
const CreateAnimalInput = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .transform(val => val.trim()), // Built-in sanitization
  
  // Use enums for controlled values
  species: z.enum(["dog", "cat", "rabbit", "bird", "other"]),
  
  // Validate and sanitize numeric inputs
  weight: z.number()
    .positive("Weight must be positive")
    .max(1000, "Weight seems unrealistic")
    .optional(),
    
  // Sanitize text inputs
  notes: z.string()
    .max(1000, "Notes too long")
    .optional()
    .transform(val => val?.trim()),
});

// Apply domain-specific sanitization
.mutation(async ({ ctx, input }) => {
  const sanitizedInput = {
    ...input,
    name: ctx.medicalSanitizer.sanitizeAnimalName(input.name),
    notes: input.notes ? ctx.medicalSanitizer.sanitizeNotes(input.notes) : undefined,
  };
  // ... rest of the procedure
});
```

### 2. Error Handling

```typescript
.mutation(async ({ ctx, input }) => {
  try {
    const result = await performOperation(input);
    
    // Log successful operations
    await ctx.logger.info("Operation completed", {
      operation: "example",
      resourceId: result.id,
    }, ctx.correlationId);
    
    return result;
    
  } catch (error) {
    // Enhanced error logging
    await ctx.logger.error(
      "Operation failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        operation: "example",
        input: ctx.sanitizer.sanitizeObject(input),
      },
      ctx.correlationId
    );
    
    // Transform database errors to user-friendly messages
    if (error instanceof DatabaseError) {
      if (error.code === "UNIQUE_VIOLATION") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A record with this information already exists",
        });
      }
    }
    
    // Re-throw with additional context
    throw error;
  }
});
```

### 3. Caching Strategy

```typescript
// Use appropriate cache keys and TTLs
const cacheKey = `resource:${resourceType}:${resourceId}:${ctx.householdId}`;
const ttl = resourceType === "real-time" ? 30 : 300; // 30s vs 5min

// Implement cache invalidation patterns
const invalidateRelatedCaches = async (ctx: EnhancedTRPCContext, result: any) => {
  await Promise.all([
    ctx.cache.delete(`animal:${result.animalId}`),
    ctx.cache.delete(`household:${ctx.householdId}:animals`),
    ctx.householdCache.invalidateHousehold(ctx.householdId),
  ]);
};

// Use stale-on-error for resilience
await ctx.cache.getOrSet(
  cacheKey,
  () => performExpensiveOperation(),
  { 
    ttl: 300, 
    staleOnError: true, // Return stale data if operation fails
    namespace: "queries",
  }
);
```

### 4. Rate Limiting Strategy

```typescript
// Apply appropriate rate limits for operation types
const operationRateLimits = {
  "read": "user", // 1000/min per user
  "write": "household", // 5000/min per household
  "critical": async () => {
    return rateLimitCriticalOperation("administration", ctx.auth.userId);
  },
  "bulk": async () => {
    return rateLimitCriticalOperation("inventory", ctx.auth.userId);
  },
};

// Handle rate limit errors gracefully
if (!rateLimitResult.success) {
  throw new TRPCError({
    code: "TOO_MANY_REQUESTS",
    message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
    cause: {
      retryAfter: rateLimitResult.retryAfter,
      rateLimitHeaders: generateRateLimitHeaders(rateLimitResult),
    },
  });
}
```

### 5. Database Operations

```typescript
// Always wrap database operations
const result = await withEnhancedDatabaseOperation(
  ctx,
  "insert", // operation type for monitoring
  "animals", // table name for logging
  async () => {
    // Use transactions for multi-step operations
    return ctx.db.transaction(async (tx) => {
      const animal = await tx.insert(animals).values(data).returning();
      await tx.insert(animalHistory).values({
        animalId: animal[0].id,
        action: "created",
        userId: ctx.auth.userId,
      });
      return animal[0];
    });
  }
);

// Handle connection issues gracefully
const fallbackData = await withCircuitBreaker(
  () => performDatabaseOperation(),
  databaseCircuitBreaker,
  () => getCachedFallbackData() // Always provide fallbacks
);
```

## Troubleshooting

### Common Issues

#### 1. Rate Limiting Errors

**Symptom**: `TOO_MANY_REQUESTS` errors

**Solutions**:
- Check rate limit configuration
- Implement exponential backoff on client
- Use admin bypass for system operations
- Optimize request patterns

```typescript
// Client-side retry with exponential backoff
const retryWithBackoff = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === "TOO_MANY_REQUESTS" && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};
```

#### 2. Circuit Breaker Open

**Symptom**: `SERVICE_UNAVAILABLE` errors

**Solutions**:
- Check database connectivity
- Monitor error rates
- Implement proper fallbacks
- Verify circuit breaker configuration

```typescript
// Check circuit breaker status
const circuitStatus = databaseCircuitBreaker.getMetrics();
console.log(`Circuit breaker state: ${circuitStatus.state}`);
console.log(`Failure rate: ${circuitStatus.failureRate}%`);

// Manual circuit breaker reset (use with caution)
if (circuitStatus.state === "OPEN" && databaseIsHealthy()) {
  databaseCircuitBreaker.reset();
}
```

#### 3. Cache Miss Performance Issues

**Symptom**: Slow response times after cache misses

**Solutions**:
- Implement cache warming strategies
- Use stale-while-revalidate patterns
- Optimize database queries
- Adjust TTL values

```typescript
// Cache warming strategy
const warmCache = async (ctx: EnhancedTRPCContext) => {
  const commonQueries = [
    () => getHouseholdAnimals(ctx.householdId),
    () => getPendingMedications(ctx.householdId),
    () => getRecentAdministrations(ctx.householdId),
  ];
  
  await Promise.allSettled(
    commonQueries.map(query => 
      ctx.cache.getOrSet(`warm:${query.name}`, query, { ttl: 600 })
    )
  );
};
```

#### 4. Input Sanitization Conflicts

**Symptom**: Valid input being rejected or modified unexpectedly

**Solutions**:
- Review sanitization rules
- Add field-specific exceptions
- Use validation schemas properly
- Test with edge cases

```typescript
// Custom sanitization rules
const sanitizedInput = ctx.sanitizer.sanitizeObject(input, {
  skipXss: false, // Enable XSS protection
  skipSql: false, // Enable SQL injection protection
  fieldRules: {
    // Field-specific rules
    medicationName: (value: string) => {
      // Allow medical terminology that might look suspicious
      const medicalExceptions = ["Co-trimoxazole", "5-ASA"];
      if (medicalExceptions.includes(value)) {
        return value;
      }
      return ctx.medicalSanitizer.sanitizeMedicationName(value);
    },
  }
});
```

### Debug Tools

#### 1. Enable Debug Logging

```typescript
// Add to your environment
LOG_LEVEL=debug
ENABLE_PERFORMANCE_LOGGING=true

// Or programmatically
ctx.logger.setLevel("debug");
```

#### 2. Performance Analysis

```typescript
// Built-in performance tracking
const tracker = ctx.performanceTracker;
console.log(`Memory usage: ${tracker.getMetrics().memoryUsed}MB`);
console.log(`Duration: ${tracker.getMetrics().duration}ms`);

// Custom performance markers
const startTime = Date.now();
await performOperation();
console.log(`Custom operation took: ${Date.now() - startTime}ms`);
```

#### 3. Cache Analysis

```typescript
// Monitor cache hit rates
const cacheStats = await ctx.cache.get("_stats");
console.log(`Cache hit rate: ${cacheStats?.hitRate || 0}%`);

// Cache debugging
const debugCache = async (key: string) => {
  const exists = await ctx.cache.get(key);
  console.log(`Cache key ${key} exists: ${!!exists}`);
  if (exists) {
    console.log(`Cache value:`, exists);
  }
};
```

### Support and Monitoring

#### 1. Health Monitoring

```typescript
// Set up health checks for all components
export const healthCheck = async (): Promise<HealthStatus> => {
  const checks = await Promise.allSettled([
    checkDatabaseHealth(),
    checkCacheHealth(),
    checkCircuitBreakerHealth(),
    checkRateLimitHealth(),
  ]);
  
  return {
    healthy: checks.every(check => check.status === "fulfilled"),
    components: {
      database: checks[0].status === "fulfilled",
      cache: checks[1].status === "fulfilled",
      circuitBreaker: checks[2].status === "fulfilled",
      rateLimit: checks[3].status === "fulfilled",
    },
    timestamp: new Date().toISOString(),
  };
};
```

#### 2. Alerting

```typescript
// Set up alerts for critical issues
const setupAlerts = () => {
  // Circuit breaker opened
  databaseCircuitBreaker.on("stateChange", (state, metrics) => {
    if (state === "OPEN") {
      sendAlert({
        level: "critical",
        message: `Database circuit breaker opened. Failure rate: ${metrics.failureRate}%`,
        metrics,
      });
    }
  });
  
  // High error rate
  logger.on("error", (error, context) => {
    if (context.severity === "high") {
      sendAlert({
        level: "high",
        message: `High severity error: ${error.message}`,
        error,
        context,
      });
    }
  });
};
```

This comprehensive integration provides robust, scalable, and maintainable tRPC procedures with full infrastructure support. Use the patterns and examples above to build reliable veterinary medication tracking features.