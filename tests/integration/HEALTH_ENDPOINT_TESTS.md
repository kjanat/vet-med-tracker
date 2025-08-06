# Health Endpoint Integration Tests

This document describes the comprehensive integration tests created for the `/api/health` endpoint and related circuit breaker status endpoint.

## Overview

The health endpoint integration tests ensure that all health check types work correctly, database and Redis connectivity checks function as expected, circuit breaker status integration works properly, and the endpoint returns appropriate status codes under various conditions.

## Test Coverage

### 1. Simple Health Check (`/api/health`)
- ✅ Returns 200 with healthy status when all systems operational
- ✅ Returns 503 when database is unhealthy
- ✅ Returns 503 when Redis is unhealthy
- ✅ Includes proper response metadata

### 2. Liveness Check (`/api/health?type=liveness`)
- ✅ Returns basic application health information
- ✅ Includes memory usage and Node.js version
- ✅ Provides uptime information
- ✅ Includes appropriate response headers

### 3. Readiness Check (`/api/health?type=readiness`)
- ✅ Returns 200 when all essential services are ready
- ✅ Returns 503 when database is not ready
- ✅ Returns 503 when critical circuit breaker is open
- ✅ Checks database, Redis, and circuit breakers

### 4. Detailed Health Check (`/api/health?type=detailed`)
- ✅ Returns comprehensive health report when all systems healthy
- ✅ Returns 206 (Partial Content) when system is degraded
- ✅ Returns 503 when system is unhealthy
- ✅ Includes metrics when requested
- ✅ Bypasses cache when `cache=false` parameter is used
- ✅ Provides detailed component status for all services

### 5. Database Connectivity Tests
- ✅ Correctly identifies database connection issues
- ✅ Detects high database usage (>80% threshold)
- ✅ Tests raw connection validation
- ✅ Validates response time monitoring

### 6. Redis Connectivity Tests  
- ✅ Correctly identifies Redis latency issues (>1000ms threshold)
- ✅ Handles Redis connection failures
- ✅ Validates Redis health check integration
- ✅ Tests error reporting for Redis failures

### 7. Circuit Breaker Status Integration
- ✅ Integrates circuit breaker status correctly
- ✅ Works with separate `/api/breaker-status` endpoint
- ✅ Reports degraded status when circuit breakers are half-open
- ✅ Handles circuit breaker failures appropriately

### 8. Rate Limiting
- ✅ Applies rate limiting after too many requests from same IP
- ✅ Returns 429 status code when rate limited
- ✅ Includes proper rate limit headers
- ✅ Provides retry-after information

### 9. Error Handling
- ✅ Returns 503 with error details when health check system fails
- ✅ Handles individual component failures gracefully
- ✅ Provides comprehensive error reporting
- ✅ Maintains proper error response structure

### 10. Text Format Response
- ✅ Returns plain text when `format=text` parameter is used
- ✅ Includes appropriate content type headers
- ✅ Provides human-readable status information

### 11. CORS Support
- ✅ Handles CORS preflight requests (OPTIONS method)
- ✅ Includes proper Access-Control headers
- ✅ Supports cross-origin requests for monitoring tools

### 12. Cache Behavior
- ✅ Caches detailed health check results
- ✅ Respects cache control parameters
- ✅ Provides cache status information in responses

## Test Architecture

### Mocking Strategy
The tests use comprehensive mocking of external dependencies:

- **Database Monitoring** (`@/lib/db-monitoring`)
  - `comprehensiveHealthCheck()` - Database metrics and health
  - `checkDatabaseHealth()` - Basic database connectivity
  - `testRawConnection()` - Raw connection validation

- **Redis Client** (`@/lib/redis/client`)
  - `checkRedisHealth()` - Redis connectivity and latency

- **Circuit Breakers** (`@/lib/circuit-breaker`)
  - All local circuit breakers (database, critical, analytics, batch)
  - Circuit breaker metrics and health status

- **Redis Circuit Breakers** (`@/lib/redis/circuit-breaker`)
  - `checkAllCircuitBreakers()` - Redis-based circuit breaker status

- **Connection Queue** (`@/lib/connection-queue`)
  - `getAllQueueStats()` - Connection pool statistics

### Rate Limiting Avoidance
Tests implement smart IP rotation to avoid triggering rate limiting:
- Different IP addresses for each test request
- Delays between test batches
- Dedicated rate limiting test with controlled conditions

### Response Time Testing
Tests account for potential zero-millisecond response times in test environments:
- Uses `toBeGreaterThanOrEqual(0)` instead of `toBeGreaterThan(0)`
- Focuses on response structure validation rather than exact timing

## Running the Tests

### Command Line
```bash
# Run health endpoint tests specifically
pnpm test:health

# Run all integration tests
pnpm test:integration

# Run with UI
pnpm test:ui

# Run specific test file
pnpm test tests/integration/health-endpoint.test.ts
```

### Test Script
A dedicated test runner script is available at `scripts/test-health-endpoints.ts` that provides:
- Clear test execution output
- Summary of test coverage
- Easy integration with CI/CD pipelines

## Integration with Production Monitoring

These tests validate the same endpoints that production monitoring systems use:

- **Load Balancers**: Simple health check (`/api/health`)
- **Kubernetes**: Liveness and readiness probes
- **Monitoring Dashboards**: Detailed health reports with metrics
- **Alerting Systems**: Circuit breaker status and degradation alerts
- **External Tools**: CORS-enabled endpoints for cross-origin monitoring

## Health Check Types Summary

| Type | Endpoint | Purpose | Response Time | Use Case |
|------|----------|---------|---------------|----------|
| Simple | `/api/health` | Load balancer checks | <50ms | External load balancers |
| Liveness | `/api/health?type=liveness` | Application alive | <100ms | Kubernetes liveness probe |
| Readiness | `/api/health?type=readiness` | Ready to serve | <500ms | Kubernetes readiness probe |
| Detailed | `/api/health?type=detailed` | Full diagnostics | <2000ms | Monitoring dashboards |

## Error Scenarios Tested

1. **Database Failures**
   - Connection timeouts
   - High usage (>80%)
   - Complete unavailability

2. **Redis Failures**
   - Connection refused
   - High latency (>1000ms)
   - Service unavailable

3. **Circuit Breaker States**
   - Open (failing)
   - Half-open (testing)
   - Closed (healthy)

4. **System Overload**
   - Rate limiting triggered
   - Resource exhaustion
   - Multiple component failures

5. **Configuration Issues**
   - Invalid parameters
   - Missing dependencies
   - Network connectivity problems

## Continuous Integration

The health endpoint tests are designed for CI/CD integration:
- No external dependencies required (all mocked)
- Fast execution (completes in <5 seconds)
- Clear pass/fail indicators
- Detailed error reporting for debugging
- Compatible with standard test runners (Jest, Vitest)

This comprehensive test suite ensures the reliability and correctness of the health check system, which is critical for production monitoring and system reliability.