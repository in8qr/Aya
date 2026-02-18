#!/bin/bash

# Complete Server Setup Script for Aya Eye
# This script sets up everything: disk mounting, networking, software, and application
# Run as root: sudo bash scripts/setup-complete-server.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

log "=========================================="
log "Aya Eye - Complete Server Setup"
log "=========================================="
log ""

# Step 1: System Updates
log "Step 1: Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git build-essential htop nano ufw net-tools

# Step 2: Disk Setup
log ""
log "Step 2: Disk setup..."
log "Available disks:"
lsblk

read -p "Do you want to mount a new disk for data storage? (y/n): " mount_disk

if [ "$mount_disk" = "y" ]; then
    read -p "Enter disk path (e.g., /dev/sdb): " DISK_PATH
    
    if [ -b "$DISK_PATH" ]; then
        log "Setting up disk: $DISK_PATH"
        
        # Check if already partitioned
        if [ -b "${DISK_PATH}1" ]; then
            warning "Partition ${DISK_PATH}1 already exists. Skipping partitioning."
            PARTITION="${DISK_PATH}1"
        else
            log "Creating partition..."
            fdisk $DISK_PATH << EOF
n
p
1


w
EOF
            PARTITION="${DISK_PATH}1"
            sleep 2
            
            log "Formatting partition..."
            mkfs.ext4 $PARTITION
            e2label $PARTITION ayaeye-data
        fi
        
        # Create mount point
        mkdir -p /mnt/ayaeye-data
        
        # Mount disk
        mount $PARTITION /mnt/ayaeye-data
        
        # Get UUID
        UUID=$(blkid -s UUID -o value $PARTITION)
        
        # Add to fstab
        if ! grep -q "$UUID" /etc/fstab; then
            cp /etc/fstab /etc/fstab.backup
            echo "UUID=$UUID /mnt/ayaeye-data ext4 defaults,nofail 0 2" >> /etc/fstab
            log "Added to /etc/fstab"
        fi
        
        # Create directory structure
        mkdir -p /mnt/ayaeye-data/{app,minio/data,backups,logs}
        chmod 755 /mnt/ayaeye-data
        chmod 755 /mnt/ayaeye-data/*
        
        log "Disk mounted successfully at /mnt/ayaeye-data"
    else
        error "Disk $DISK_PATH not found"
    fi
else
    log "Skipping disk mount. Using default location."
    mkdir -p /opt/ayaeye/{app,minio/data,backups,logs}
fi

# Step 3: Network Configuration
log ""
log "Step 3: Network configuration..."

# Configure DNS (Cloudflare DNS)
if ! grep -q "1.1.1.1" /etc/resolv.conf; then
    log "Configuring DNS (Cloudflare)..."
    cp /etc/resolv.conf /etc/resolv.conf.backup
    echo "nameserver 1.1.1.1" >> /etc/resolv.conf
    echo "nameserver 1.0.0.1" >> /etc/resolv.conf
    echo "nameserver 8.8.8.8" >> /etc/resolv.conf
fi

# Test connectivity
log "Testing network connectivity..."
if ping -c 1 8.8.8.8 &> /dev/null; then
    log "Network connectivity OK"
else
    warning "Network connectivity test failed. Please check your network settings."
fi

# Step 4: Firewall Setup
log ""
log "Step 4: Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
log "Firewall configured"

# Step 5: Install Node.js
log ""
log "Step 5: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    log "Node.js installed: $(node --version)"
else
    log "Node.js already installed: $(node --version)"
fi

# Step 6: Install PostgreSQL
log ""
log "Step 6: Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    
    read -p "Enter PostgreSQL password for 'ayaeye' user: " DB_PASSWORD
    
    sudo -u postgres psql << EOF
CREATE DATABASE aya_photography;
CREATE USER ayaeye WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE ayaeye SET client_encoding TO 'utf8';
ALTER ROLE ayaeye SET default_transaction_isolation TO 'read committed';
ALTER ROLE ayaeye SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aya_photography TO ayaeye;
\q
EOF
    
    log "PostgreSQL installed and database created"
else
    log "PostgreSQL already installed"
fi

# Step 7: Install Nginx
log ""
log "Step 7: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    log "Nginx installed"
else
    log "Nginx already installed"
fi

# Step 8: Install PM2
log ""
log "Step 8: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    log "PM2 installed"
else
    log "PM2 already installed"
fi

# Step 9: Install Docker
log ""
log "Step 9: Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    apt install -y docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    rm get-docker.sh
    log "Docker installed"
else
    log "Docker already installed"
fi

# Step 10: Create Application User
log ""
log "Step 10: Creating application user..."
if ! id "ayaeye" &>/dev/null; then
    adduser --disabled-password --gecos "" ayaeye
    usermod -aG sudo,docker ayaeye
    log "User 'ayaeye' created"
else
    log "User 'ayaeye' already exists"
    usermod -aG sudo,docker ayaeye
fi

# Set ownership of data directory
if [ -d "/mnt/ayaeye-data" ]; then
    chown -R ayaeye:ayaeye /mnt/ayaeye-data
fi

# Step 11: Setup PM2 Startup
log ""
log "Step 11: Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root | grep "sudo" | bash || true

# Step 12: Install Certbot
log ""
log "Step 12: Installing Certbot (for SSL)..."
apt install -y certbot python3-certbot-nginx

log ""
log "=========================================="
log "Server setup completed!"
log "=========================================="
log ""
log "Next steps:"
log "1. Switch to ayaeye user: sudo su - ayaeye"
log "2. Clone/copy your application to:"
if [ -d "/mnt/ayaeye-data" ]; then
    log "   /mnt/ayaeye-data/app"
else
    log "   /opt/ayaeye/app"
fi
log "3. Configure .env file"
log "4. Run: npm install && npx prisma generate && npx prisma db push"
log "5. Run: npm run build"
log "6. Run: pm2 start ecosystem.config.js"
log "7. Configure Nginx (see COMPLETE_SERVER_SETUP.md)"
log "8. Setup Cloudflare DNS (see COMPLETE_SERVER_SETUP.md)"
log "9. Run: certbot --nginx -d yourdomain.com"
log ""
log "For detailed instructions, see COMPLETE_SERVER_SETUP.md"
