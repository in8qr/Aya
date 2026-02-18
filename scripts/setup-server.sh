#!/bin/bash

# Server Setup Script for Aya Eye
# Run this script on a fresh Ubuntu/Debian server as root
# Usage: sudo bash scripts/setup-server.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

log "Starting server setup for Aya Eye..."

# Update system
log "Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
log "Installing essential tools..."
apt install -y curl wget git build-essential ufw

# Install Node.js 20.x
log "Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    log "Node.js already installed: $(node --version)"
fi

# Install PostgreSQL
log "Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    log "PostgreSQL already installed"
fi

# Install Nginx
log "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    log "Nginx already installed"
fi

# Install PM2
log "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    log "PM2 already installed"
fi

# Install Docker (optional, for MinIO)
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    apt install -y docker-compose-plugin
    rm get-docker.sh
else
    log "Docker already installed"
fi

# Create application user
log "Creating application user..."
if ! id "ayaeye" &>/dev/null; then
    adduser --disabled-password --gecos "" ayaeye
    usermod -aG sudo,docker ayaeye
    log "User 'ayaeye' created"
else
    log "User 'ayaeye' already exists"
fi

# Setup firewall
log "Configuring firewall..."
ufw --force enable
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
log "Firewall configured"

log "Server setup completed!"
log ""
log "Next steps:"
log "1. Switch to ayaeye user: sudo su - ayaeye"
log "2. Clone your repository or copy files to ~/apps/aya-eye"
log "3. Run: cp .env.example .env and configure it"
log "4. Run: npm install"
log "5. Run: npx prisma generate && npx prisma db push"
log "6. Run: npm run build"
log "7. Run: pm2 start ecosystem.config.js"
log "8. Configure Nginx (see DEPLOYMENT.md)"
