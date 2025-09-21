#!/bin/bash
# VetMed Tracker Production Deployment Script
# Zero-downtime deployment with comprehensive quality gates

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOYMENT_ENV="${DEPLOYMENT_ENV:-production}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
  echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $*${NC}" >&2
}

warn() {
  echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARN: $*${NC}" >&2
}

error() {
  echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*${NC}" >&2
}

success() {
  echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $*${NC}" >&2
}

# Error handling
error_exit() {
  error "$1"
  if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
    perform_rollback
  fi
  exit 1
}

# Notification functions
send_slack_notification() {
  local message="$1"
  local color="${2:-good}"

  if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
      "$SLACK_WEBHOOK_URL" || warn "Failed to send Slack notification"
  fi
}

# Pre-deployment checks
check_prerequisites() {
  log "Checking deployment prerequisites..."

  # Check required tools
  local required_tools=("docker" "docker-compose" "curl" "jq")
  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      error_exit "Required tool not found: $tool"
    fi
  done

  # Check environment variables
  local required_vars=("DATABASE_URL" "VETMED_ENCRYPTION_KEY")
  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      error_exit "Required environment variable not set: $var"
    fi
  done

  # Check Docker daemon
  if ! docker info >/dev/null 2>&1; then
    error_exit "Docker daemon is not running"
  fi

  # Check network connectivity
  if ! curl -s --max-time 10 https://google.com >/dev/null; then
    error_exit "Network connectivity check failed"
  fi

  success "Prerequisites check passed"
}

# Quality gates validation
run_quality_gates() {
  if [[ "$SKIP_TESTS" == "true" ]]; then
    warn "Skipping quality gates as requested"
    return 0
  fi

  log "Running quality gates..."

  cd "$PROJECT_ROOT"

  # Run security tests
  log "Running security tests..."
  if ! bun run test:security; then
    error_exit "Security tests failed"
  fi

  # Run performance tests
  log "Running performance tests..."
  if ! bun run test:performance; then
    error_exit "Performance tests failed"
  fi

  # Run accessibility tests
  log "Running accessibility tests..."
  if ! bun run test:accessibility; then
    error_exit "Accessibility tests failed"
  fi

  # Run medical workflow tests
  log "Running medical workflow tests..."
  if ! bun run test:medical; then
    error_exit "Medical workflow tests failed"
  fi

  # Run integration tests
  log "Running integration tests..."
  if ! bun run test:integration; then
    error_exit "Integration tests failed"
  fi

  # Run quality pipeline
  log "Running quality pipeline..."
  if ! bun run quality:pipeline; then
    error_exit "Quality pipeline failed"
  fi

  success "All quality gates passed"
}

# Database backup before deployment
backup_database() {
  log "Creating database backup before deployment..."

  # Run backup script
  if ! docker-compose exec -T postgres /scripts/backup.sh; then
    error_exit "Database backup failed"
  fi

  success "Database backup completed"
}

# Build and test Docker images
build_and_test_images() {
  log "Building Docker images..."

  cd "$PROJECT_ROOT"

  # Build application image
  if ! docker build -t vetmed-tracker:latest -t "vetmed-tracker:$(git rev-parse --short HEAD)" .; then
    error_exit "Docker build failed"
  fi

  # Security scan of Docker image
  log "Scanning Docker image for vulnerabilities..."
  if command -v trivy >/dev/null 2>&1; then
    if ! trivy image --exit-code 1 --severity HIGH,CRITICAL vetmed-tracker:latest; then
      error_exit "Docker image security scan failed"
    fi
  else
    warn "Trivy not available, skipping container security scan"
  fi

  # Test image functionality
  log "Testing Docker image functionality..."
  local test_container
  test_container=$(docker run -d --name vetmed-test-$$ \
    -e NODE_ENV=production \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    vetmed-tracker:latest)

  # Wait for container to be ready
  sleep 10

  # Check if container is running
  if ! docker ps | grep -q "$test_container"; then
    docker logs "$test_container"
    docker rm -f "$test_container" || true
    error_exit "Docker image test failed - container not running"
  fi

  # Test health endpoint
  local container_ip
  container_ip=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$test_container")

  if ! curl -f "http://$container_ip:3000/api/health" >/dev/null 2>&1; then
    docker logs "$test_container"
    docker rm -f "$test_container" || true
    error_exit "Docker image test failed - health check failed"
  fi

  # Cleanup test container
  docker rm -f "$test_container" || true

  success "Docker image build and test completed"
}

# Deploy application with zero-downtime
deploy_application() {
  log "Deploying application with zero-downtime strategy..."

  cd "$PROJECT_ROOT"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: Would deploy application now"
    return 0
  fi

  # Create deployment timestamp
  local deployment_id
  deployment_id="deploy-$(date +%Y%m%d-%H%M%S)"
  export DEPLOYMENT_ID="$deployment_id"

  # Update docker-compose with new image
  docker-compose pull || true

  # Rolling update strategy
  log "Starting rolling update..."

  # Scale up new instances
  docker-compose up -d --scale app=2 --no-recreate

  # Wait for new instances to be healthy
  local max_attempts=30
  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
      log "New instances are healthy"
      break
    fi
    ((attempt++))
    log "Waiting for new instances to be healthy... attempt $attempt/$max_attempts"
    sleep 10
  done

  if [[ $attempt -eq $max_attempts ]]; then
    error_exit "New instances failed to become healthy"
  fi

  # Remove old instances
  docker-compose up -d --scale app=1

  # Final health check
  if ! curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    error_exit "Deployment health check failed"
  fi

  success "Application deployment completed"
}

# Database migrations
run_database_migrations() {
  log "Running database migrations..."

  cd "$PROJECT_ROOT"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN: Would run database migrations now"
    return 0
  fi

  # Run migrations in transaction for safety
  if ! docker-compose exec -T postgres psql -d "$DATABASE_URL" -c "BEGIN; $(cat db/migrations/generated/*.sql); COMMIT;"; then
    error_exit "Database migration failed"
  fi

  success "Database migrations completed"
}

# Post-deployment verification
verify_deployment() {
  log "Verifying deployment..."

  # Health check
  if ! curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    error_exit "Post-deployment health check failed"
  fi

  # API functionality test
  local api_test_response
  api_test_response=$(curl -s http://localhost:3000/api/trpc/health.check)
  if ! echo "$api_test_response" | jq -e '.result.data' >/dev/null 2>&1; then
    error_exit "API functionality test failed"
  fi

  # Database connectivity test
  if ! docker-compose exec -T postgres pg_isready; then
    error_exit "Database connectivity test failed"
  fi

  # Performance smoke test
  local response_time
  response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:3000/)
  if (($(echo "$response_time > 5.0" | bc -l))); then
    warn "High response time detected: ${response_time}s"
  fi

  success "Deployment verification completed"
}

# Rollback procedure
perform_rollback() {
  warn "Performing deployment rollback..."

  cd "$PROJECT_ROOT"

  # Get previous image tag
  local previous_tag
  previous_tag=$(git rev-parse --short HEAD~1)

  # Rollback to previous version
  docker-compose down
  docker tag "vetmed-tracker:$previous_tag" vetmed-tracker:latest || true
  docker-compose up -d

  # Wait for rollback to complete
  sleep 30

  # Verify rollback
  if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    success "Rollback completed successfully"
    send_slack_notification "🔄 VetMed Tracker deployment rolled back successfully" "warning"
  else
    error "Rollback verification failed"
    send_slack_notification "❌ VetMed Tracker rollback failed - manual intervention required" "danger"
  fi
}

# Cleanup old resources
cleanup_resources() {
  log "Cleaning up old resources..."

  # Remove old Docker images (keep last 3)
  docker images vetmed-tracker --format "table {{.Tag}}" | tail -n +4 | while read -r tag; do
    if [[ "$tag" != "latest" ]] && [[ "$tag" != "<none>" ]]; then
      docker rmi "vetmed-tracker:$tag" || true
    fi
  done

  # Clean up unused volumes
  docker volume prune -f || true

  # Clean up old backup files (keep last 30 days)
  find "$PROJECT_ROOT/backups" -name "*.sql*" -mtime +30 -delete 2>/dev/null || true

  success "Resource cleanup completed"
}

# Main deployment workflow
main() {
  log "Starting VetMed Tracker deployment to $DEPLOYMENT_ENV..."

  send_slack_notification "🚀 VetMed Tracker deployment started for $DEPLOYMENT_ENV" "good"

  local start_time
  start_time=$(date +%s)

  # Deployment steps
  check_prerequisites
  run_quality_gates
  backup_database
  build_and_test_images
  run_database_migrations
  deploy_application
  verify_deployment
  cleanup_resources

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  success "Deployment completed successfully in ${duration}s"
  send_slack_notification "✅ VetMed Tracker deployment completed successfully in ${duration}s" "good"
}

# Handle script arguments
case "${1:-deploy}" in
"deploy")
  main
  ;;
"rollback")
  perform_rollback
  ;;
"check")
  check_prerequisites
  ;;
"quality")
  run_quality_gates
  ;;
*)
  echo "Usage: $0 {deploy|rollback|check|quality}"
  echo "Environment variables:"
  echo "  DEPLOYMENT_ENV=production"
  echo "  DRY_RUN=false"
  echo "  SKIP_TESTS=false"
  echo "  ROLLBACK_ON_FAILURE=true"
  exit 1
  ;;
esac
