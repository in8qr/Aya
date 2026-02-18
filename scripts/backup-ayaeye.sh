#!/bin/bash

# Comprehensive Backup Script for Aya Eye
# Backs up database, MinIO data, and application files
# Usage: ./scripts/backup-ayaeye.sh
# Run daily via cron: 0 2 * * * /home/ayaeye/apps/aya-eye/scripts/backup-ayaeye.sh

set -e

# Configuration
BACKUP_DIR="/mnt/ayaeye-data/backups"
if [ ! -d "$BACKUP_DIR" ]; then
    BACKUP_DIR="/opt/ayaeye/backups"
fi

DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7
APP_DIR="/mnt/ayaeye-data/app"
if [ ! -d "$APP_DIR" ]; then
    APP_DIR="/opt/ayaeye/app"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[BACKUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting backup at $(date)"
log "Backup directory: $BACKUP_DIR"

# Backup PostgreSQL database
if command -v pg_dump &> /dev/null; then
    log "Backing up PostgreSQL database..."
    if sudo -u postgres pg_dump aya_photography > "$BACKUP_DIR/db_$DATE.sql" 2>/dev/null; then
        # Compress database backup
        gzip "$BACKUP_DIR/db_$DATE.sql"
        log "Database backup completed: db_$DATE.sql.gz"
    else
        error "Database backup failed"
        exit 1
    fi
else
    warning "PostgreSQL not found, skipping database backup"
fi

# Backup MinIO data (if using Docker)
if docker ps | grep -q minio; then
    log "Backing up MinIO data..."
    CONTAINER_NAME=$(docker ps | grep minio | awk '{print $NF}')
    VOLUME_NAME=$(docker inspect $CONTAINER_NAME | grep -A 5 "Mounts" | grep "Source" | head -1 | awk '{print $2}' | tr -d '",')
    
    if [ -n "$VOLUME_NAME" ] && [ -d "$VOLUME_NAME" ]; then
        tar czf "$BACKUP_DIR/minio_$DATE.tar.gz" -C "$VOLUME_NAME" . 2>/dev/null || {
            error "MinIO backup failed"
        }
        log "MinIO backup completed: minio_$DATE.tar.gz"
    else
        warning "MinIO volume not found, skipping MinIO backup"
    fi
else
    warning "MinIO container not running, skipping MinIO backup"
fi

# Backup application .env file (important!)
if [ -f "$APP_DIR/.env" ]; then
    log "Backing up .env file..."
    cp "$APP_DIR/.env" "$BACKUP_DIR/env_$DATE.env"
    log ".env backup completed"
fi

# Backup Prisma schema
if [ -f "$APP_DIR/prisma/schema.prisma" ]; then
    log "Backing up Prisma schema..."
    cp "$APP_DIR/prisma/schema.prisma" "$BACKUP_DIR/schema_$DATE.prisma"
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "minio_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "env_*.env" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "schema_*.prisma" -mtime +$RETENTION_DAYS -delete

# Show backup summary
log ""
log "Backup Summary:"
log "==============="
du -h "$BACKUP_DIR"/*$DATE* 2>/dev/null | while read size file; do
    log "  $file: $size"
done

log ""
log "Backup completed successfully!"
log "Backup location: $BACKUP_DIR"
log "Total backup size: $(du -sh $BACKUP_DIR | awk '{print $1}')"
