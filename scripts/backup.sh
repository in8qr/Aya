#!/bin/bash

# Backup Script for Aya Eye
# Creates backups of database and MinIO data
# Usage: ./scripts/backup.sh
# Run daily via cron: 0 2 * * * /home/ayaeye/apps/aya-eye/scripts/backup.sh

set -e

BACKUP_DIR="/var/backups/ayaeye"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting backup at $(date)"

# Backup PostgreSQL database
if command -v pg_dump &> /dev/null; then
    log "Backing up PostgreSQL database..."
    sudo -u postgres pg_dump aya_photography > "$BACKUP_DIR/db_$DATE.sql" || {
        echo "Database backup failed"
        exit 1
    }
    log "Database backup completed: db_$DATE.sql"
else
    log "PostgreSQL not found, skipping database backup"
fi

# Backup MinIO data (if using Docker)
if docker ps | grep -q minio; then
    log "Backing up MinIO data..."
    docker run --rm \
        -v aya-eye_minio_data:/data \
        -v "$BACKUP_DIR":/backup \
        alpine tar czf /backup/minio_$DATE.tar.gz -C /data . || {
        echo "MinIO backup failed"
    }
    log "MinIO backup completed: minio_$DATE.tar.gz"
else
    log "MinIO container not running, skipping MinIO backup"
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_*.sql" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +$RETENTION_DAYS -delete

log "Backup completed successfully!"
log "Backup location: $BACKUP_DIR"
