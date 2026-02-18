#!/bin/bash

# Aya Eye Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Example: ./scripts/deploy.sh production

set -e  # Exit on error

ENVIRONMENT=${1:-production}
APP_DIR="/home/ayaeye/apps/aya-eye"
LOG_FILE="$APP_DIR/logs/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as correct user
if [ "$USER" != "ayaeye" ]; then
    error "This script should be run as the 'ayaeye' user"
fi

# Create logs directory
mkdir -p "$APP_DIR/logs"

log "Starting deployment for environment: $ENVIRONMENT"
log "Application directory: $APP_DIR"

# Navigate to application directory
cd "$APP_DIR" || error "Failed to change to application directory"

# Check if .env exists
if [ ! -f ".env" ]; then
    error ".env file not found. Please create it from .env.example"
fi

# Backup current build
if [ -d ".next" ]; then
    log "Backing up current build..."
    tar -czf "logs/backup-$(date +%Y%m%d-%H%M%S).tar.gz" .next || warning "Failed to backup .next directory"
fi

# Pull latest code (if using git)
if [ -d ".git" ]; then
    log "Pulling latest code from repository..."
    git pull origin main || git pull origin master || warning "Failed to pull latest code"
fi

# Install dependencies
log "Installing dependencies..."
npm ci --production=false || error "Failed to install dependencies"

# Generate Prisma Client
log "Generating Prisma Client..."
npx prisma generate || error "Failed to generate Prisma Client"

# Run database migrations
log "Running database migrations..."
npx prisma migrate deploy || warning "Migration failed or no migrations to run"

# Build application
log "Building application..."
npm run build || error "Build failed"

# Restart application with PM2
if command -v pm2 &> /dev/null; then
    log "Restarting application with PM2..."
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js || error "Failed to restart PM2"
    pm2 save || warning "Failed to save PM2 configuration"
else
    warning "PM2 not found. Please restart the application manually."
fi

log "Deployment completed successfully!"
log "Check application status with: pm2 status"
log "View logs with: pm2 logs aya-eye"
