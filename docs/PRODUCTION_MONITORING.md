# Production Monitoring System

## Overview

VetMed Tracker implements a comprehensive production monitoring system designed to ensure reliability, performance, and observability in production environments. The system provides real-time health monitoring, automatic failure detection, graceful degradation, and detailed performance metrics.

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Architecture                   │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Health    │  │  Circuit    │  │    Rate     │        │
│  │  Endpoint   │  │  Breakers   │  │  Limiting   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                 │                 │             │
│         └─────────────────┼─────────────────┘             │
│                           │                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Connection  │  │ Database    │  │   Error     │        │
│  │   Queue     │  │ Monitoring  │  │ Tracking    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Proactive Monitoring**: Detect issues before they impact users
2. **Graceful Degradation**: Maintain service availability during failures
3. **Observable Performance**: Comprehensive metrics and alerting
4. **Automatic Recovery**: Self-healing mechanisms where possible
5. **Neon Free Tier Optimization**: Efficient resource usage within limits

## System Components

### 1. Health Check Endpoint (`/api/health`)

The health endpoint provides real-time system status with basic and detailed modes.

#### Basic Health Check
```bash
curl http://localhost:3000/api/health
```

**Response Format:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600000,
  "database": "healthy",
  "queue": "healthy"
}
```

#### Detailed Health Check
```bash
curl "http://localhost:3000/api/health?detailed=true"
```

**Response includes:**
- Complete component health status
- Circuit breaker states and metrics
- Connection queue statistics
- Error rates and performance metrics
- Active alerts and degradation info

### 2. Circuit Breaker Protection

Automatic failure protection with configurable thresholds.

#### Circuit Breaker Types

| Component | Failure Threshold | Recovery Time | Purpose |
|-----------|------------------|---------------|---------|
| Database | 5 failures | 30 seconds | Protects against DB connection issues |
| Critical | 3 failures | 10 seconds | Fast protection for critical operations |
| Analytics | 8 failures | 45 seconds | Analytics and reporting operations |
| Batch | 10 failures | 60 seconds | Background processing operations |

#### States and Behavior

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failing fast, returns cached/fallback responses
- **HALF_OPEN**: Testing recovery, limited requests allowed

### 3. Rate Limiting System

Protects against API abuse and resource exhaustion.

#### Rate Limit Policies

```typescript
// Configuration in lib/rate-limiting.ts
{
  general: { requests: 100, window: 60000 },     // 100 req/min
  auth: { requests: 5, window: 900000 },         // 5 req/15min
  recording: { requests: 30, window: 60000 },    // 30 req/min
  heavy: { requests: 10, window: 60000 },        // 10 req/min
  upload: { requests: 10, window: 300000 }       // 10 req/5min
}
```

#### Rate Limit Headers

Responses include rate limit information:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### 4. Connection Queue Management

Intelligent database connection management optimized for Neon's free tier.

#### Queue Configuration

```typescript
{
  maxConcurrent: 8,        // Max simultaneous connections
  maxQueueSize: 200,       // Max queued requests
  requestTimeout: 30000,   // 30 second timeout
  priorities: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BATCH']
}
```

#### Priority Scheduling

- **CRITICAL**: User-facing medication recording
- **HIGH**: Authentication and security operations
- **NORMAL**: General API requests
- **LOW**: Analytics and reporting
- **BATCH**: Background processing

### 5. Database Monitoring

Real-time database performance and connection tracking.

#### Monitored Metrics

```typescript
interface ConnectionMetrics {
  isHealthy: boolean;
  responseTime: number;
  connectionCount: number;
  usagePercentage: number;
  lastChecked: Date;
  error?: string;
}
```

#### Alert Thresholds

```typescript
const DEFAULT_THRESHOLDS = {
  maxResponseTime: 5000,      // 5 seconds
  maxUsagePercentage: 80,     // 80%
  maxConnectionCount: 10      // Free tier limit
};
```

## Configuration and Setup

### Environment Variables

```bash
# Database connection
DATABASE_URL="postgresql://..."

# Monitoring configuration
NODE_ENV="production"
HEALTH_CHECK_INTERVAL=30000
CIRCUIT_BREAKER_ENABLED=true
RATE_LIMITING_ENABLED=true

# Alert thresholds
MAX_RESPONSE_TIME=5000
MAX_DB_USAGE_PERCENTAGE=80
MAX_CONNECTION_COUNT=10
```

### Health Check Setup

1. **Configure monitoring interval:**
```typescript
// In your application startup
import { DatabaseMonitor } from '@/lib/db-monitoring';

const monitor = new DatabaseMonitor({
  maxResponseTime: 5000,
  maxUsagePercentage: 80,
  maxConnectionCount: 10
});

// Start monitoring with 30-second intervals
monitor.startMonitoring(30000, (violations, metrics) => {
  console.error('Health alert:', violations);
  // Send to alerting system
});
```

2. **Set up external monitoring:**
```bash
# Add to your monitoring service (DataDog, New Relic, etc.)
curl -f http://your-app.com/api/health || exit 1
```

### Circuit Breaker Configuration

```typescript
import { 
  databaseCircuitBreaker,
  criticalCircuitBreaker 
} from '@/lib/circuit-breaker';

// Custom thresholds for production
databaseCircuitBreaker.configure({
  failureThreshold: 3,      // Open after 3 failures
  recoveryTimeout: 20000,   // 20 second recovery
  monitoringPeriod: 60000   // 1 minute monitoring window
});
```

### Rate Limiting Setup

```typescript
import { createRateLimit } from '@/lib/rate-limiting';

// Custom rate limits for production
const productionLimits = {
  general: { requests: 1000, window: 60000 },    // Higher for production
  auth: { requests: 10, window: 900000 },        // More auth attempts
  critical: { requests: 100, window: 60000 }     // Critical operations
};
```

## Best Practices for Neon Free Tier

### Connection Optimization

1. **Use connection pooling:**
```typescript
// Already configured in db/drizzle.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!, {
  fetchConnectionCache: true  // Enable connection caching
});
```

2. **Minimize connection time:**
```typescript
// Use connection queue for efficient management
import { globalConnectionQueue } from '@/lib/connection-queue';

// Wrap database operations
const result = await globalConnectionQueue.execute(
  async () => {
    return await db.select().from(animals);
  },
  'HIGH' // Priority level
);
```

3. **Implement connection health checks:**
```typescript
// Regular health monitoring
import { comprehensiveHealthCheck } from '@/lib/db-monitoring';

const health = await comprehensiveHealthCheck();
if (!health.isHealthy) {
  console.warn('Database health issue:', health.error);
}
```

### Resource Usage Optimization

1. **Query optimization:**
```sql
-- Use indexes effectively
CREATE INDEX CONCURRENTLY idx_administrations_animal_date 
ON administrations(animal_id, scheduled_date);

-- Limit query scope
SELECT * FROM administrations 
WHERE animal_id = $1 
AND scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 100;
```

2. **Batch operations:**
```typescript
// Group database operations
import { batchCircuitBreaker } from '@/lib/circuit-breaker';

await batchCircuitBreaker.execute(async () => {
  // Batch multiple operations together
  return await db.transaction(async (tx) => {
    await tx.insert(administrations).values(batchData);
    await tx.update(inventory).set({ quantity: newQuantity });
  });
});
```

3. **Connection monitoring:**
```typescript
// Monitor usage against limits
const metrics = await getConnectionMetrics();
if (metrics.usagePercentage > 75) {
  console.warn(`High DB usage: ${metrics.usagePercentage}%`);
  // Implement backpressure
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High Response Times

**Symptoms:**
- Health check shows response times > 5000ms
- Users experiencing slow page loads

**Diagnosis:**
```bash
# Check detailed health status
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.database'

# Review connection queue
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.queue'
```

**Solutions:**
1. Check database connection limits
2. Review slow queries in application logs
3. Verify Neon database instance status
4. Consider query optimization

#### 2. Circuit Breaker Activation

**Symptoms:**
- Frequent 503 errors
- Circuit breaker state shows "OPEN"
- Degraded service functionality

**Diagnosis:**
```bash
# Check circuit breaker states
curl "http://localhost:3000/api/health?detailed=true" | jq '.components.circuitBreakers'

# Review failure patterns
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.circuitBreakers'
```

**Solutions:**
1. Investigate underlying failure cause
2. Verify database connectivity
3. Check for connection pool exhaustion
4. Review error logs for patterns

#### 3. Rate Limiting Issues

**Symptoms:**
- Users receiving 429 Too Many Requests
- Legitimate traffic being blocked

**Diagnosis:**
```bash
# Check rate limit status in headers
curl -I "http://localhost:3000/api/trpc/animals.list"

# Monitor rate limiting patterns
grep "rate limit" application.log | tail -100
```

**Solutions:**
1. Review rate limit thresholds
2. Implement user-specific limits
3. Add rate limit exemptions for admin users
4. Consider progressive rate limiting

#### 4. Connection Queue Backup

**Symptoms:**
- Increasing queue sizes
- Request timeouts
- Slow database operations

**Diagnosis:**
```bash
# Check queue statistics
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.queue'

# Monitor queue trends
watch -n 5 'curl -s "http://localhost:3000/api/health" | jq .queue'
```

**Solutions:**
1. Increase connection pool size (if within Neon limits)
2. Optimize slow queries
3. Implement query prioritization
4. Add connection queue alerts

### Health Check Status Codes

| Status | HTTP Code | Description | Action Required |
|--------|-----------|-------------|-----------------|
| healthy | 200 | All systems operational | None |
| degraded | 206 | Partial functionality | Monitor closely |
| unhealthy | 503 | Service unavailable | Immediate attention |

### Log Analysis

#### Key Log Patterns

```bash
# Circuit breaker events
grep "Circuit breaker" application.log

# Rate limiting events  
grep "Rate limit" application.log

# Database connection issues
grep "Database" application.log | grep -i error

# Queue backup events
grep "Queue" application.log | grep -i "backup\|overflow"
```

#### Metrics to Monitor

1. **Response Time Percentiles:**
   - P50 < 500ms
   - P95 < 2000ms
   - P99 < 5000ms

2. **Error Rates:**
   - Overall error rate < 1%
   - 5xx errors < 0.5%
   - Circuit breaker activations < 5/hour

3. **Resource Usage:**
   - Database connection usage < 80%
   - Queue depth < 50 items
   - Memory usage < 90%

## Emergency Procedures

### 1. Database Connection Exhaustion

**Immediate Actions:**
1. Restart application to clear connection pool
2. Check Neon database status
3. Temporarily reduce connection limits

**Recovery Steps:**
```typescript
// Emergency connection reset
import { globalConnectionQueue } from '@/lib/connection-queue';

// Clear queue and restart
globalConnectionQueue.clear();
await globalConnectionQueue.healthCheck();
```

### 2. Circuit Breaker Storm

**Immediate Actions:**
1. Check underlying service health
2. Manually reset circuit breakers if needed
3. Implement manual fallbacks

**Recovery Steps:**
```typescript
// Manual circuit breaker reset (use carefully)
import { databaseCircuitBreaker } from '@/lib/circuit-breaker';

// Reset if underlying issue is resolved
databaseCircuitBreaker.reset();
```

### 3. High Error Rate

**Immediate Actions:**
1. Enable maintenance mode if critical
2. Check recent deployments
3. Review error patterns

**Recovery Steps:**
1. Rollback recent changes
2. Scale down traffic if possible
3. Implement additional monitoring

### 4. Performance Degradation

**Immediate Actions:**
1. Check database and external service status
2. Review recent configuration changes
3. Monitor resource usage

**Recovery Steps:**
1. Optimize slow queries
2. Increase connection limits (within Neon constraints)
3. Implement caching where appropriate

## Alerting Setup

### Recommended Alerts

1. **Critical Alerts (PagerDuty/immediate notification):**
   - Health endpoint returning 503
   - Circuit breaker open for > 5 minutes
   - Database connection usage > 90%
   - Error rate > 5%

2. **Warning Alerts (Slack/email notification):**
   - Response time P95 > 3 seconds
   - Queue depth > 100 items
   - Rate limit violations > 100/hour
   - Circuit breaker activation

3. **Info Alerts (dashboard/logging):**
   - Response time trends
   - Connection usage patterns
   - Rate limit usage statistics
   - Performance metrics

### External Monitoring Integration

#### Uptime Monitoring
```bash
# Pingdom/UptimeRobot configuration
GET /api/health
Expected: 200 status
Frequency: 1 minute
Timeout: 10 seconds
```

#### APM Integration
```typescript
// Example: New Relic integration
import newrelic from 'newrelic';

// Custom metrics
newrelic.recordMetric('Custom/Database/ConnectionUsage', usagePercentage);
newrelic.recordMetric('Custom/CircuitBreaker/State', breaker.isOpen() ? 1 : 0);
```

#### Log Aggregation
```bash
# Example: DataDog log configuration
{
  "source": "vetmed-tracker",
  "service": "api",
  "tags": ["env:production", "component:monitoring"]
}
```

## Performance Monitoring

### Key Performance Indicators (KPIs)

1. **Availability:**
   - Target: 99.9% uptime
   - Measurement: Health endpoint availability

2. **Performance:**
   - Target: P95 response time < 2 seconds
   - Measurement: Application response times

3. **Reliability:**
   - Target: Error rate < 1%
   - Measurement: HTTP 5xx responses

4. **Resource Efficiency:**
   - Target: Database usage < 80%
   - Measurement: Connection pool metrics

### Monitoring Dashboard

Create a monitoring dashboard with these widgets:

1. **System Health Status**
   - Overall health indicator
   - Component status grid
   - Recent alerts summary

2. **Performance Metrics**
   - Response time charts (P50, P95, P99)
   - Request rate and error rate
   - Database connection usage

3. **Circuit Breaker Status**
   - Current states (OPEN/CLOSED/HALF_OPEN)
   - Failure rates and recovery times
   - Historical activation patterns

4. **Resource Usage**
   - Connection pool utilization
   - Queue depth over time
   - Rate limiting statistics

### Load Testing

Regular load testing ensures monitoring accuracy:

```bash
# Run comprehensive load tests
pnpm tsx scripts/load-test.ts all

# Run specific scenario
pnpm tsx scripts/load-test.ts scenario normal

# Monitor during load test
pnpm tsx scripts/monitor-during-load.ts
```

## Security Considerations

### Monitoring Security

1. **Rate Limiting Protection:**
   - Prevents API abuse and DDoS attacks
   - Protects authentication endpoints
   - Monitors for unusual traffic patterns

2. **Circuit Breaker Security:**
   - Prevents cascading failures
   - Protects against resource exhaustion
   - Maintains service availability during attacks

3. **Health Endpoint Security:**
   - Limit detailed information in production
   - Implement IP restrictions if needed
   - Monitor for unauthorized access

### Data Protection

1. **Avoid logging sensitive data:**
```typescript
// Good: Log operation without sensitive data
console.log('User authentication failed', { userId, timestamp });

// Bad: Don't log sensitive information
console.log('Login failed', { userId, password, email });
```

2. **Health check data minimization:**
```typescript
// Production health check - minimal information
if (process.env.NODE_ENV === 'production') {
  return {
    status: health.status,
    timestamp: new Date().toISOString()
  };
}
```

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Weekly:**
   - Review monitoring metrics
   - Check alert thresholds
   - Analyze performance trends

2. **Monthly:**
   - Run comprehensive load tests
   - Review and update alert configurations
   - Optimize slow queries identified

3. **Quarterly:**
   - Evaluate monitoring stack performance
   - Update circuit breaker thresholds
   - Review and update documentation

### Monitoring Stack Updates

1. **Before updating:**
   - Test in staging environment
   - Review breaking changes
   - Prepare rollback plan

2. **After updating:**
   - Verify all monitoring components
   - Test alert functionality
   - Update documentation

### Capacity Planning

Monitor trends to plan for growth:

1. **Database connections:**
   - Track usage patterns
   - Plan for Neon tier upgrades
   - Optimize connection efficiency

2. **Performance scaling:**
   - Monitor response time trends
   - Identify scaling bottlenecks
   - Plan infrastructure upgrades

## Conclusion

The VetMed Tracker monitoring system provides comprehensive observability and automatic protection against common failure modes. With proper configuration and maintenance, it ensures reliable operation even under stress conditions while optimizing for Neon's free tier constraints.

Key benefits:
- **Proactive issue detection** through health monitoring
- **Automatic protection** via circuit breakers and rate limiting
- **Resource optimization** for Neon free tier usage
- **Comprehensive observability** with detailed metrics
- **Emergency procedures** for rapid incident response

For ongoing success:
1. Monitor the monitoring - ensure monitoring tools are healthy
2. Regular testing - run load tests to validate behavior
3. Threshold tuning - adjust based on real-world usage patterns
4. Documentation updates - keep procedures current
5. Team training - ensure team understands monitoring tools

This monitoring foundation supports reliable production operation and provides the observability needed for continuous improvement.