# VetMed Tracker Logging System

A comprehensive structured logging system with correlation IDs, audit trails, and performance monitoring designed for the VetMed Tracker application.

## Features

- ✅ **Structured JSON Logging** - Machine-readable logs with consistent format
- ✅ **Correlation ID Propagation** - Track requests across services and operations
- ✅ **Sensitive Data Masking** - Automatically mask passwords, tokens, and PII
- ✅ **Performance Metrics** - Track operation duration, memory usage, and CPU usage
- ✅ **Audit Trail** - Comprehensive audit logging for compliance and security
- ✅ **tRPC Integration** - Seamless integration with existing tRPC setup
- ✅ **Serverless Optimized** - Works efficiently in Vercel/serverless environments
- ✅ **Request/Response Logging** - HTTP middleware for Next.js
- ✅ **Multiple Log Levels** - DEBUG, INFO, WARN, ERROR, FATAL
- ✅ **Environment-Aware** - Different configurations for dev/prod/test

## Quick Start

### Basic Logging

```typescript
import { logger } from '@/lib/logging';

// Simple logging
await logger.info('User logged in successfully', { 
  userId: '123',
  timestamp: new Date().toISOString()
});

await logger.error('Database connection failed', error, {
  database: 'main',
  retryCount: 3
});
```

### With Correlation IDs

```typescript
import { logger } from '@/lib/logging';

// Generate or extract correlation ID
const correlationId = await logger.extractCorrelationId();

// Use across multiple operations
await logger.info('Starting user registration', { email: 'user@example.com' }, correlationId);
await logger.info('Validation passed', { step: 'email_validation' }, correlationId);
await logger.info('User created successfully', { userId: 'new-123' }, correlationId);
```

### Performance Tracking

```typescript
import { logger } from '@/lib/logging';

// Automatic performance tracking
await logger.trackOperation(
  'user.registration',
  async (context) => {
    // Simulate user registration process
    const user = await createUser(userData);
    const profile = await createProfile(user.id, profileData);
    return { user, profile };
  }
);

// Manual performance tracking
const tracker = logger.startPerformanceTracking();
// ... do work ...
const metrics = tracker.getMetrics();
await logger.withPerformance(LogLevel.INFO, 'Complex calculation completed', metrics);
```

## tRPC Integration

### Using the Middleware

```typescript
// In your tRPC setup (server/api/trpc.ts)
import { enhancedLoggingMiddleware } from '@/lib/logging';

export const publicProcedure = t.procedure
  .use(connectionMiddleware)
  .use(enhancedLoggingMiddleware);
```

### Audit Logging in Procedures

```typescript
// In tRPC procedures
import { trpcAudit, trpcDb } from '@/lib/logging';

export const recordAdministration = householdProcedure
  .input(recordAdministrationSchema)
  .mutation(async ({ ctx, input }) => {
    // Log database operation with performance tracking
    const administration = await trpcDb.logOperation(
      ctx,
      'create',
      'administrations',
      () => db.insert(administrations).values(administrationData)
    );

    // Log critical audit event
    await trpcAudit.logMedicationAdministration(
      ctx,
      input.animalId,
      input.regimenId,
      administration.id,
      input.isHighRisk
    );

    return administration;
  });
```

### Database Operations

```typescript
// Log database queries with context
await trpcDb.logQuery(
  ctx,
  'findUserByEmail',
  { email: input.email },
  () => db.select().from(users).where(eq(users.email, input.email))
);

// Log operations with performance tracking
await trpcDb.logOperation(
  ctx,
  'update',
  'animals',
  () => db.update(animals).set(updateData).where(eq(animals.id, animalId))
);
```

## Audit Logging

### Critical Events

```typescript
import { auditLog, AuditEventType } from '@/lib/logging';

// Medication administration (critical for compliance)
await auditLog.medicationGiven(
  userId,
  householdId,
  animalId,
  regimenId,
  administrationId,
  true, // isHighRisk
  { medicationName: 'Insulin', dose: '5 units' }
);

// Co-signing for high-risk medications
await auditLog.coSignRequired(userId, householdId, animalId, administrationId);
await auditLog.coSignCompleted(userId, coSignerUserId, householdId, animalId, administrationId);
```

### Security Events

```typescript
// Unauthorized access attempts
await auditLog.unauthorizedAccess(
  suspiciousUserId,
  targetHouseholdId,
  ipAddress,
  userAgent,
  { attemptedResource: '/admin/sensitive-data' }
);

// Permission denied events
await auditLog.permissionDenied(
  userId,
  householdId,
  'households.financial_data',
  'read'
);
```

### Data Change Tracking

```typescript
import { auditLogger, AuditEventType } from '@/lib/logging';

// Track data changes with before/after values
await auditLogger.logDataChange(
  AuditEventType.ANIMAL_UPDATED,
  userId,
  householdId,
  animalId,
  'animal',
  { name: 'Buddy', weight: '25 lbs' }, // previousValues
  { name: 'Buddy', weight: '27 lbs' }, // newValues
  'Weight update after vet visit' // reason
);
```

## Request/Response Logging

### Next.js Middleware Integration

```typescript
// middleware.ts
import { requestLoggingMiddleware } from '@/lib/logging';
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware((auth, req) => {
  // Apply request logging
  return requestLoggingMiddleware(req, (modifiedReq) => {
    // Continue with Clerk middleware
    return NextResponse.next();
  });
});
```

### API Route Logging

```typescript
// In API routes
import { logAPIRoute } from '@/lib/logging';

export async function POST(request: NextRequest) {
  return await logAPIRoute(request, 'webhook.clerk', async (context) => {
    // Your API route logic here
    const result = await processWebhook(request);
    return NextResponse.json(result);
  });
}
```

## Configuration

### Environment-Specific Setup

```typescript
import { Logger, AuditLogger, getEnvironmentConfig } from '@/lib/logging';

const config = getEnvironmentConfig();

// Custom logger instance
const customLogger = new Logger(config.logger);

// Custom audit logger
const customAuditLogger = new AuditLogger(config.audit);
```

### Custom Configuration

```typescript
import { Logger, LogLevel } from '@/lib/logging';

const logger = new Logger({
  service: 'my-service',
  minLevel: LogLevel.INFO,
  enableStructured: true,
  maskSensitiveData: true,
  sensitiveFields: ['password', 'ssn', 'creditCard'],
  enablePerformanceTracking: true,
  maxMessageLength: 1000,
});
```

## Log Structure

All logs follow this structured format:

```json
{
  "timestamp": "2024-08-06T10:30:00.000Z",
  "level": 1,
  "message": "User logged in successfully",
  "correlationId": "req_12345678-1234-1234-1234-123456789012",
  "requestId": "vercel_req_abc123",
  "userId": "user_123",
  "householdId": "household_456",
  "sessionId": "session_789",
  "service": "vet-med-tracker",
  "operation": "auth.login",
  "duration": 156,
  "metadata": {
    "email": "u***@example.com",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "success": true
  },
  "performance": {
    "duration": 156,
    "memoryUsage": {
      "heapUsed": 45.2,
      "heapTotal": 67.8
    }
  },
  "tags": ["authentication", "successful"]
}
```

## Audit Log Structure

Audit events include additional compliance information:

```json
{
  "timestamp": "2024-08-06T10:30:00.000Z",
  "level": 1,
  "message": "Audit: medication.administered",
  "correlationId": "req_12345678-1234-1234-1234-123456789012",
  "userId": "user_123",
  "householdId": "household_456",
  "animalId": "animal_789",
  "service": "vet-med-tracker",
  "audit": true,
  "metadata": {
    "eventType": "medication.administered",
    "severity": "medium",
    "targetId": "admin_101112",
    "targetType": "administration",
    "regimenId": "regimen_131415",
    "medicationName": "Amoxicillin",
    "dose": "250mg",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  }
}
```

## Sensitive Data Masking

The system automatically masks sensitive fields:

- Passwords and secrets → `***`
- JWT tokens → `eyJhbGci...token...xuMjg2`
- Email addresses → `jo***@example.com`
- Long strings → `abcd...xyz`

### Custom Sensitive Fields

```typescript
const logger = new Logger({
  maskSensitiveData: true,
  sensitiveFields: [
    'password', 'token', 'secret', 'ssn', 'creditCard',
    'veterinaryLicense', 'medicalRecord' // Custom fields
  ]
});
```

## Performance Considerations

### Serverless Optimization

- Context cleanup prevents memory leaks
- Minimal overhead for excluded paths
- Efficient correlation ID generation
- Automatic performance tracking

### Log Volume Management

```typescript
// Exclude noisy endpoints
const middleware = createTRPCLoggingMiddleware({
  excludePaths: ['/health', '/ping', '/metrics'],
  maxPayloadSize: 1000, // Truncate large payloads
  logResponses: process.env.NODE_ENV === 'development' // Only in dev
});
```

## Best Practices

### 1. Use Correlation IDs Consistently

```typescript
// Extract at the start of operations
const correlationId = await logger.extractCorrelationId();

// Pass through all related operations
await logger.info('Step 1', metadata, correlationId);
await logger.info('Step 2', metadata, correlationId);
await logger.info('Step 3', metadata, correlationId);
```

### 2. Log at Appropriate Levels

```typescript
// DEBUG: Development debugging info
await logger.debug('Cache hit for user data', { cacheKey, ttl });

// INFO: Normal operation events
await logger.info('User registered successfully', { userId, email });

// WARN: Recoverable issues
await logger.warn('Rate limit approaching', { requests: 95, limit: 100 });

// ERROR: Errors that need attention
await logger.error('Database connection failed', error, { retryCount: 3 });

// FATAL: Critical system failures
await logger.fatal('Service startup failed', error, { component: 'database' });
```

### 3. Include Context in Metadata

```typescript
await logger.info('Medication administered', {
  userId,
  householdId,
  animalId,
  medicationName: 'Insulin',
  dose: '5 units',
  route: 'subcutaneous',
  administeredBy: 'owner'
});
```

### 4. Use Audit Logging for Compliance

```typescript
// Always audit critical medical events
await auditLog.medicationGiven(userId, householdId, animalId, regimenId, adminId, isHighRisk);

// Audit access control changes
await auditLogger.logDataChange(
  AuditEventType.HOUSEHOLD_MEMBER_ROLE_CHANGED,
  userId, householdId, memberId, 'membership',
  { role: 'CAREGIVER' }, { role: 'OWNER' },
  'Promoted to household owner'
);
```

### 5. Performance Track Important Operations

```typescript
// Track operations that affect user experience
await logger.trackOperation('report.generation', async () => {
  const data = await generateComplianceReport(householdId);
  return data;
});
```

## Monitoring and Alerting

### Log Queries for Monitoring

```bash
# Find errors in the last hour
jq 'select(.level >= 3 and .timestamp > (now - 3600))' logs.jsonl

# Find failed medication administrations
jq 'select(.metadata.eventType == "medication.administration.failed")' logs.jsonl

# Find high-risk medication events
jq 'select(.metadata.eventType == "high_risk.medication.administered")' logs.jsonl

# Performance issues (operations taking >5 seconds)
jq 'select(.duration > 5000)' logs.jsonl
```

### Correlation ID Tracing

```bash
# Follow a specific request across all logs
jq 'select(.correlationId == "req_12345678-1234-1234-1234-123456789012")' logs.jsonl
```

### Security Monitoring

```bash
# Unauthorized access attempts
jq 'select(.metadata.eventType == "security.unauthorized_access")' logs.jsonl

# Failed co-sign attempts
jq 'select(.metadata.eventType == "co_sign.failed")' logs.jsonl
```

## Troubleshooting

### Common Issues

1. **Headers not available**: Use try-catch when accessing headers in non-request contexts
2. **Memory leaks**: Always call `logger.cleanupContext()` in finally blocks
3. **Sensitive data exposure**: Add custom fields to `sensitiveFields` array
4. **Performance impact**: Use `excludePaths` for high-frequency endpoints

### Debug Mode

```typescript
// Enable verbose logging for debugging
const debugLogger = new Logger({
  minLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableStructured: false, // Human-readable output
});
```

## License

This logging system is part of the VetMed Tracker application and follows the same license terms.