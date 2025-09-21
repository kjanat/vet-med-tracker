#!/bin/bash
# VetMed Tracker Database Backup Script
# HIPAA-compliant automated backup with encryption

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-vetmed}"
POSTGRES_USER="${POSTGRES_USER:-vetmed}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"

# Logging
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >&2
}

# Error handling
error_exit() {
  log "ERROR: $1"
  notify_failure "$1"
  exit 1
}

# Slack notification
notify_success() {
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"✅ VetMed Tracker backup completed successfully: $1\"}" \
      "$SLACK_WEBHOOK" || true
  fi
}

notify_failure() {
  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"❌ VetMed Tracker backup failed: $1\"}" \
      "$SLACK_WEBHOOK" || true
  fi
}

# Wait for database to be ready
wait_for_db() {
  log "Waiting for database to be ready..."
  for i in {1..30}; do
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"; then
      log "Database is ready"
      return 0
    fi
    log "Waiting for database... attempt $i/30"
    sleep 10
  done
  error_exit "Database is not ready after 5 minutes"
}

# Create backup
create_backup() {
  local timestamp
  timestamp=$(date '+%Y%m%d_%H%M%S')
  local backup_file="$BACKUP_DIR/vetmed_backup_$timestamp.sql"
  local compressed_file="$backup_file.gz"
  local encrypted_file="$compressed_file.enc"

  log "Creating backup: $backup_file"

  # Create SQL dump with custom format for faster restore
  pg_dump \
    -h "$POSTGRES_HOST" \
    -p "$POSTGRES_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=custom \
    --compress=9 \
    --no-password \
    >"$backup_file" || error_exit "Failed to create database dump"

  # Compress backup
  log "Compressing backup..."
  gzip "$backup_file" || error_exit "Failed to compress backup"

  # Encrypt backup if encryption key provided
  if [[ -n "$ENCRYPTION_KEY" ]]; then
    log "Encrypting backup..."
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
      -in "$compressed_file" \
      -out "$encrypted_file" \
      -pass pass:"$ENCRYPTION_KEY" || error_exit "Failed to encrypt backup"

    # Remove unencrypted file
    rm "$compressed_file"
    backup_file="$encrypted_file"
  else
    backup_file="$compressed_file"
  fi

  # Verify backup integrity
  if [[ ! -f "$backup_file" ]] || [[ ! -s "$backup_file" ]]; then
    error_exit "Backup file is empty or does not exist"
  fi

  local backup_size
  backup_size=$(du -h "$backup_file" | cut -f1)
  log "Backup created successfully: $backup_file ($backup_size)"

  # Upload to S3 if configured
  if [[ -n "$S3_BUCKET" ]]; then
    upload_to_s3 "$backup_file"
  fi

  echo "$backup_file"
}

# Upload to S3
upload_to_s3() {
  local backup_file="$1"
  local s3_key
  s3_key="backups/$(basename "$backup_file")"

  log "Uploading backup to S3: s3://$S3_BUCKET/$s3_key"

  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$backup_file" "s3://$S3_BUCKET/$s3_key" \
      --storage-class STANDARD_IA \
      --server-side-encryption AES256 || error_exit "Failed to upload to S3"
    log "Backup uploaded to S3 successfully"
  else
    log "AWS CLI not available, skipping S3 upload"
  fi
}

# Clean old backups
cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."

  find "$BACKUP_DIR" -name "vetmed_backup_*.sql*" -type f -mtime +"$RETENTION_DAYS" -delete || true

  # Clean S3 backups if configured
  if [[ -n "$S3_BUCKET" ]] && command -v aws >/dev/null 2>&1; then
    local cutoff_date
    cutoff_date=$(date -d "$RETENTION_DAYS days ago" '+%Y-%m-%d')
    aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
      local file_date
      file_date=$(echo "$line" | awk '{print $1}')
      local file_name
      file_name=$(echo "$line" | awk '{print $4}')
      if [[ "$file_date" < "$cutoff_date" ]]; then
        aws s3 rm "s3://$S3_BUCKET/backups/$file_name" || true
        log "Deleted old S3 backup: $file_name"
      fi
    done
  fi

  log "Cleanup completed"
}

# Test backup restore (dry run)
test_restore() {
  local backup_file="$1"
  local test_db="${POSTGRES_DB}_restore_test"

  log "Testing backup restore..."

  # Create test database
  createdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$test_db" || true

  # Restore backup to test database
  if [[ "$backup_file" == *.enc ]]; then
    # Decrypt and restore
    openssl enc -aes-256-cbc -d -pbkdf2 -iter 100000 \
      -in "$backup_file" \
      -pass pass:"$ENCRYPTION_KEY" |
      gunzip |
      pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$test_db" --verbose || error_exit "Failed to restore test backup"
  elif [[ "$backup_file" == *.gz ]]; then
    # Decompress and restore
    gunzip -c "$backup_file" |
      pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$test_db" --verbose || error_exit "Failed to restore test backup"
  else
    # Direct restore
    pg_restore -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$test_db" --verbose "$backup_file" || error_exit "Failed to restore test backup"
  fi

  # Verify tables exist
  local table_count
  table_count=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$test_db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

  if [[ "$table_count" -gt 0 ]]; then
    log "Backup restore test successful: $table_count tables restored"
  else
    error_exit "Backup restore test failed: no tables found"
  fi

  # Clean up test database
  dropdb -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" "$test_db" || true
}

# Main backup process
main() {
  log "Starting VetMed Tracker database backup..."

  # Create backup directory
  mkdir -p "$BACKUP_DIR"

  # Wait for database
  wait_for_db

  # Create backup
  local backup_file
  backup_file=$(create_backup)

  # Test restore
  test_restore "$backup_file"

  # Clean old backups
  cleanup_old_backups

  # Success notification
  local backup_size
  backup_size=$(du -h "$backup_file" | cut -f1)
  notify_success "Backup size: $backup_size"

  log "Backup process completed successfully"
}

# Run main function
main "$@"
