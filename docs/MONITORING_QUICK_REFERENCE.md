# Monitoring Quick Reference Guide

Quick reference for VetMed Tracker production monitoring system. For comprehensive documentation, see [PRODUCTION_MONITORING.md](./PRODUCTION_MONITORING.md).

## 🏥 Health Check Commands

### Basic Health Status
```bash
# Quick health check (load balancer friendly)
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z", 
  "uptime": 3600000,
  "database": "healthy",
  "queue": "healthy"
}
```

### Detailed Health Information
```bash
# Complete system metrics
curl "http://localhost:3000/api/health?detailed=true"

# Parse specific components
curl "http://localhost:3000/api/health?detailed=true" | jq '.components.database'
curl "http://localhost:3000/api/health?detailed=true" | jq '.components.circuitBreakers'
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.queue'
```

## 📊 Key Metrics Dashboard

### Response Time Thresholds
- ✅ **Good**: P95 < 1000ms
- ⚠️ **Warning**: P95 1000-2000ms  
- 🚨 **Critical**: P95 > 2000ms

### Error Rate Thresholds
- ✅ **Good**: < 0.5%
- ⚠️ **Warning**: 0.5-1%
- 🚨 **Critical**: > 1%

### Database Usage Thresholds
- ✅ **Good**: < 60%
- ⚠️ **Warning**: 60-80%
- 🚨 **Critical**: > 80%

### Connection Queue Thresholds
- ✅ **Good**: < 20 items
- ⚠️ **Warning**: 20-50 items
- 🚨 **Critical**: > 50 items

## 🔧 Component Status Check

### Circuit Breaker States
```bash
# Check all circuit breaker states
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '.components.circuitBreakers | to_entries[] | {name: .key, status: .value.status, state: .value.details.state}'

# Expected states:
# CLOSED = Normal operation ✅
# HALF_OPEN = Testing recovery ⚠️  
# OPEN = Failing fast 🚨
```

### Database Connection Monitoring
```bash
# Database health and performance
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '{
    status: .components.database.status,
    responseTime: .components.database.responseTime,
    connectionCount: .metrics.database.connectionCount,
    usagePercentage: .metrics.database.usagePercentage
  }'
```

### Connection Queue Status
```bash
# Queue performance metrics
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '{
    status: .components.queue.status,
    activeConnections: .metrics.queue.activeConnections,
    queuedItems: .metrics.queue.queuedItems,
    averageWaitTime: .metrics.queue.averageWaitTime
  }'
```

## 🚨 Alert Conditions

### Critical Alerts (Immediate Action Required)
```bash
# Check for critical issues
HEALTH=$(curl -s http://localhost:3000/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" = "unhealthy" ]; then
  echo "🚨 CRITICAL: System unhealthy"
  # Trigger immediate notification
fi
```

### Warning Conditions
```bash
# Check for warning conditions
curl -s "http://localhost:3000/api/health?detailed=true" | jq '
  if .status == "degraded" then
    "⚠️ WARNING: System degraded - " + (.degradation.reason // "Unknown")
  elif .metrics.database.responseTime > 3000 then
    "⚠️ WARNING: High database response time: " + (.metrics.database.responseTime | tostring) + "ms"
  elif .metrics.queue.queuedItems > 50 then
    "⚠️ WARNING: Queue backup: " + (.metrics.queue.queuedItems | tostring) + " items"
  else
    "✅ OK: No warnings detected"
  end'
```

## 🔄 Circuit Breaker Management

### Check Circuit Breaker Status
```bash
# Database circuit breaker
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '.components.circuitBreakers.database | {status, state: .details.state, failures: .details.failureCount}'

# Critical operations circuit breaker  
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '.components.circuitBreakers.critical | {status, state: .details.state, failures: .details.failureCount}'
```

### Circuit Breaker Recovery
```bash
# Monitor circuit breaker recovery
watch -n 5 'curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq ".components.circuitBreakers | to_entries[] | select(.value.details.state != \"CLOSED\") | {name: .key, state: .value.details.state}"'
```

## 🏃‍♂️ Performance Testing

### Quick Load Test
```bash
# Run basic load test
pnpm tsx scripts/load-test.ts scenario normal

# Monitor during load test (in separate terminal)
pnpm tsx scripts/monitor-during-load.ts
```

### Stress Testing
```bash
# High load scenario
pnpm tsx scripts/load-test.ts scenario highLoad

# Rate limit testing
pnpm tsx scripts/load-test.ts scenario rateLimitTest

# Circuit breaker testing
pnpm tsx scripts/load-test.ts scenario circuitBreakerTest
```

### Safeguards Verification
```bash
# Test all safeguards
pnpm tsx scripts/test-safeguards.ts

# Interactive demonstration
pnpm tsx scripts/demo-safeguards.ts
```

## 📈 Monitoring Scripts

### Continuous Health Monitoring
```bash
# Monitor health status every 10 seconds
watch -n 10 'curl -s http://localhost:3000/api/health | jq "{status, database, queue}"'

# Monitor with timestamps
while true; do
  echo "$(date): $(curl -s http://localhost:3000/api/health | jq -r '.status')"
  sleep 30
done
```

### Database Connection Monitoring
```bash
# Monitor database usage
watch -n 5 'curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq "{usage: .metrics.database.usagePercentage, connections: .metrics.database.connectionCount, responseTime: .metrics.database.responseTime}"'
```

### Queue Performance Monitoring
```bash
# Monitor connection queue
watch -n 5 'curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq "{queued: .metrics.queue.queuedItems, active: .metrics.queue.activeConnections, waitTime: .metrics.queue.averageWaitTime}"'
```

## 🔍 Troubleshooting Commands

### Identify Performance Issues
```bash
# Check response times
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:3000/api/health

# curl-format.txt content:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#    time_pretransfer:  %{time_pretransfer}\n
#       time_redirect:  %{time_redirect}\n
#  time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#          time_total:  %{time_total}\n
```

### Check Rate Limiting
```bash
# Test rate limits with headers
curl -I http://localhost:3000/api/trpc/animals.list

# Look for headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1640995200
```

### Database Connection Issues
```bash
# Test raw database connection
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '{healthy: .metrics.database.isHealthy, error: .metrics.database.error}'

# Check connection pool status
curl -s "http://localhost:3000/api/health?detailed=true" | \
  jq '{connections: .metrics.database.connectionCount, usage: .metrics.database.usagePercentage}'
```

## 📋 Health Status Codes

| HTTP Status | Health Status | Description | Action |
|-------------|---------------|-------------|---------|
| 200 | healthy | All systems operational | Monitor normally |
| 206 | degraded | Partial functionality | Investigate warnings |
| 503 | unhealthy | Service unavailable | Immediate response required |

## 🛠️ Emergency Commands

### System Recovery
```bash
# Check if system is recovering
curl -s http://localhost:3000/api/health | jq '.status'

# Monitor recovery progress
watch -n 5 'curl -s http://localhost:3000/api/health | jq "{status, uptime, timestamp}"'
```

### Force Circuit Breaker Reset (Use with caution)
```javascript
// In browser console (emergency only)
fetch('/api/health?detailed=true')
  .then(r => r.json())
  .then(data => {
    console.log('Circuit Breaker States:', 
      Object.entries(data.components.circuitBreakers)
        .map(([name, cb]) => `${name}: ${cb.details?.state}`)
    );
  });
```

## 📱 Mobile/Quick Commands

### One-line Health Check
```bash
curl -s http://localhost:3000/api/health | jq -r '.status'
# Returns: healthy | degraded | unhealthy
```

### Quick Problem Detection
```bash
# Check for any issues
curl -s "http://localhost:3000/api/health?detailed=true" | jq '
  if .status != "healthy" then
    {issue: .status, alerts: .alerts}
  else
    "✅ All systems healthy"
  end'
```

### Essential Metrics Summary
```bash
# Get key metrics in one command
curl -s "http://localhost:3000/api/health?detailed=true" | jq '{
  status: .status,
  dbResponseTime: .metrics.database.responseTime,
  dbUsage: .metrics.database.usagePercentage,
  queueDepth: .metrics.queue.queuedItems,
  alerts: .alerts
}'
```

## 🔔 Alert Integration Examples

### Slack Integration
```bash
# Send alert to Slack webhook
WEBHOOK_URL="your-slack-webhook-url"
STATUS=$(curl -s http://localhost:3000/api/health | jq -r '.status')

if [ "$STATUS" != "healthy" ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"🚨 VetMed Tracker: $STATUS\"}" \
    $WEBHOOK_URL
fi
```

### Email Alert
```bash
# Send email alert (requires mailutils)
STATUS=$(curl -s http://localhost:3000/api/health | jq -r '.status')

if [ "$STATUS" = "unhealthy" ]; then
  echo "VetMed Tracker system is $STATUS" | \
    mail -s "🚨 VetMed Tracker Alert" admin@yourcompany.com
fi
```

### PagerDuty Integration
```bash
# Create PagerDuty incident
ROUTING_KEY="your-pagerduty-routing-key"
STATUS=$(curl -s http://localhost:3000/api/health | jq -r '.status')

if [ "$STATUS" = "unhealthy" ]; then
  curl -X POST https://events.pagerduty.com/v2/enqueue \
    -H 'Content-Type: application/json' \
    -d "{
      \"routing_key\": \"$ROUTING_KEY\",
      \"event_action\": \"trigger\",
      \"payload\": {
        \"summary\": \"VetMed Tracker system unhealthy\",
        \"severity\": \"critical\",
        \"source\": \"vetmed-monitoring\"
      }
    }"
fi
```

---

For detailed configuration, troubleshooting, and advanced monitoring setup, see the complete [Production Monitoring Guide](./PRODUCTION_MONITORING.md).