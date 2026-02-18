# Aya Eye - Linux Deployment Guide

This guide provides step-by-step instructions for deploying the Aya Eye application to a Linux server (Ubuntu/Debian recommended).

> **Server already running other apps (Docker, media stack, Cloudflare tunnel, etc.)?**  
> Use **[EXISTING_SERVER_DEPLOYMENT.md](./EXISTING_SERVER_DEPLOYMENT.md)** so you don’t overwrite data or existing configs.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Application Deployment](#application-deployment)
4. [Database Setup](#database-setup)
5. [Storage Setup (MinIO/S3)](#storage-setup-minios3)
6. [Reverse Proxy (Nginx)](#reverse-proxy-nginx)
7. [Process Management (PM2)](#process-management-pm2)
8. [SSL/HTTPS Setup](#sslhttps-setup)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

- **OS:** Ubuntu 22.04 LTS or Debian 12+ (recommended)
- **RAM:** Minimum 2GB (4GB+ recommended)
- **CPU:** 2+ cores
- **Storage:** 20GB+ free space
- **Network:** Public IP or domain name

### Software Requirements

- Node.js 20.x or higher
- PostgreSQL 14+ (or managed database)
- Nginx (for reverse proxy)
- PM2 (for process management)
- Docker & Docker Compose (optional, for MinIO)
- Git

---

## Server Setup

### 1. Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Create application user (recommended)
sudo adduser --disabled-password --gecos "" ayaeye
sudo usermod -aG sudo ayaeye
```

### 2. Install Node.js 20.x

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### 3. Install PostgreSQL

**Option A: Local PostgreSQL**

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE aya_photography;
CREATE USER ayaeye WITH PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE aya_photography TO ayaeye;
\q
EOF
```

**Option B: Managed Database (Recommended for Production)**

Use a managed PostgreSQL service (AWS RDS, DigitalOcean, etc.) and note the connection string.

### 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 5. Install PM2

```bash
sudo npm install -g pm2
```

### 6. Install Docker (for MinIO, optional)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ayaeye

# Install Docker Compose
sudo apt install -y docker-compose-plugin

# Logout and login again for docker group to take effect
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Switch to application user
sudo su - ayaeye

# Create application directory
mkdir -p ~/apps
cd ~/apps

# Clone your repository (replace with your repo URL)
git clone https://github.com/yourusername/aya-eye.git
cd aya-eye

# Or if deploying from local machine, use SCP:
# From your local machine:
# scp -r /path/to/AyaEye ayaeye@YOUR_SERVER_IP:~/apps/
```

### 2. Install Dependencies

```bash
cd ~/apps/aya-eye
npm install --production=false
```

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure `.env` with production values:**

```env
# Database (use your PostgreSQL connection string)
DATABASE_URL="postgresql://ayaeye:YOUR_SECURE_PASSWORD@localhost:5432/aya_photography"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"  # or http://YOUR_IP:3000 if no domain
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate on server

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Aya Eye <noreply@yourdomain.com>"

# S3 Storage
# Option 1: MinIO (local)
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="YOUR_MINIO_PASSWORD"
S3_PORTFOLIO_BUCKET="aya-portfolio"
S3_RECEIPTS_BUCKET="aya-receipts"
S3_FORCE_PATH_STYLE="true"

# Option 2: AWS S3
# S3_ENDPOINT=""  # Leave empty for AWS
# S3_REGION="us-east-1"
# S3_ACCESS_KEY_ID="your-aws-key"
# S3_SECRET_ACCESS_KEY="your-aws-secret"
# S3_PORTFOLIO_BUCKET="aya-portfolio"
# S3_RECEIPTS_BUCKET="aya-receipts"
# S3_FORCE_PATH_STYLE="false"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Generate NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 4. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (if you have migrations)
npx prisma migrate deploy

# Or push schema (for initial setup)
npx prisma db push

# Seed database (optional, creates initial admin/team accounts)
npm run db:seed
```

### 5. Build Application

```bash
# Build Next.js application
npm run build

# Verify build succeeded
ls -la .next
```

---

## Database Setup

### Using Local PostgreSQL

If using local PostgreSQL, ensure it's configured:

```bash
# Edit PostgreSQL config for remote access (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = 'localhost'  # or '*' for remote access

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host    aya_photography    ayaeye    127.0.0.1/32    md5

sudo systemctl restart postgresql
```

### Database Backups

Set up automated backups:

```bash
# Create backup script
sudo nano /usr/local/bin/ayaeye-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/ayaeye"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump aya_photography > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/ayaeye-backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/ayaeye-backup.sh
```

---

## Storage Setup (MinIO/S3)

### Option 1: MinIO (Local Docker)

```bash
# Create docker-compose for production MinIO
cd ~/apps/aya-eye
nano docker-compose.prod.yml
```

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: YOUR_SECURE_MINIO_PASSWORD
    ports:
      - "127.0.0.1:9000:9000"  # API (only localhost)
      - "127.0.0.1:9001:9001"  # Console (only localhost)
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

volumes:
  minio_data:
```

```bash
# Start MinIO
docker compose -f docker-compose.prod.yml up -d

# Create buckets via MinIO Console (http://localhost:9001)
# Or use MinIO client:
docker run --rm -it \
  -e MINIO_SERVER_ENDPOINT=localhost:9000 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=YOUR_SECURE_MINIO_PASSWORD \
  minio/mc alias set local http://localhost:9000 minioadmin YOUR_SECURE_MINIO_PASSWORD
docker run --rm -it minio/mc mb local/aya-portfolio
docker run --rm -it minio/mc mb local/aya-receipts
docker run --rm -it minio/mc anonymous set download local/aya-portfolio
```

### Option 2: AWS S3

1. Create AWS account and S3 buckets
2. Create IAM user with S3 access
3. Configure `.env` with AWS credentials
4. Set bucket policies:
   - `aya-portfolio`: Public read access
   - `aya-receipts`: Private (no public access)

---

## Process Management (PM2)

### 1. Create PM2 Ecosystem File

```bash
cd ~/apps/aya-eye
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'aya-eye',
      script: 'npm',
      args: 'start',
      cwd: '/home/ayaeye/apps/aya-eye',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/home/ayaeye/apps/aya-eye/logs/pm2-error.log',
      out_file: '/home/ayaeye/apps/aya-eye/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
    },
  ],
};
```

### 2. Start Application with PM2

```bash
# Create logs directory
mkdir -p logs

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown (usually: sudo env PATH=... pm2 startup systemd -u ayaeye --hp /home/ayaeye)
```

### 3. PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs aya-eye

# Restart application
pm2 restart aya-eye

# Stop application
pm2 stop aya-eye

# Monitor
pm2 monit
```

---

## Reverse Proxy (Nginx)

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/aya-eye
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain or IP

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For initial setup without SSL, use this:
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for large file uploads
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Increase client body size for file uploads
    client_max_body_size 50M;
}

# HTTPS configuration (uncomment after SSL setup)
# server {
#     listen 443 ssl http2;
#     server_name yourdomain.com www.yourdomain.com;
#
#     ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
#     ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers HIGH:!aNULL:!MD5;
#
#     location / {
#         proxy_pass http://localhost:3000;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_set_header X-Real-IP $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto $scheme;
#         proxy_cache_bypass $http_upgrade;
#         
#         proxy_read_timeout 300s;
#         proxy_connect_timeout 300s;
#     }
#
#     client_max_body_size 50M;
# }
```

### 2. Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update Nginx config

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is set up automatically via systemd timer
```

### Update Nginx Config After SSL

After SSL is set up, update the Nginx config to redirect HTTP to HTTPS and uncomment the HTTPS server block.

---

## Monitoring & Maintenance

### 1. Application Logs

```bash
# PM2 logs
pm2 logs aya-eye --lines 100

# Application logs (if using file logging)
tail -f ~/apps/aya-eye/logs/app.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. System Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop

# Check disk usage
df -h

# Check memory
free -h

# Check running processes
htop
```

### 3. Update Application

```bash
cd ~/apps/aya-eye

# Pull latest changes
git pull origin main  # or your branch

# Install dependencies
npm install --production=false

# Run database migrations (if any)
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart application
pm2 restart aya-eye
```

### 4. Backup Strategy

**Database Backups:**
- Automated daily backups (see Database Setup section)
- Manual backup: `pg_dump aya_photography > backup.sql`

**File Storage:**
- If using MinIO, backup the Docker volume
- If using AWS S3, enable versioning and lifecycle policies

**Application Code:**
- Keep code in Git repository
- Tag releases: `git tag -a v1.0.0 -m "Release 1.0.0"`

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs aya-eye

# Check if port 3000 is in use
sudo lsof -i :3000

# Check environment variables
cd ~/apps/aya-eye
cat .env

# Test database connection
npx prisma db pull
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U ayaeye -d aya_photography

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Nginx 502 Bad Gateway

```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs aya-eye

# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### File Upload Issues

```bash
# Check S3/MinIO connection
# Test MinIO console: http://your-server-ip:9001

# Check bucket permissions
# Verify S3 credentials in .env

# Check Nginx client_max_body_size setting
```

### High Memory Usage

```bash
# Check memory usage
free -h
pm2 monit

# Restart application
pm2 restart aya-eye

# Consider increasing server RAM or optimizing application
```

---

## Security Checklist

- [ ] Change all default passwords (PostgreSQL, MinIO, etc.)
- [ ] Use strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Enable firewall (UFW)
- [ ] Set up SSL/HTTPS
- [ ] Restrict database access (only localhost if possible)
- [ ] Keep system and packages updated
- [ ] Use environment variables for secrets (never commit `.env`)
- [ ] Set up automated backups
- [ ] Monitor logs regularly
- [ ] Use strong passwords for all accounts
- [ ] Restrict SSH access (key-based auth, disable root login)

### Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Quick Reference

### Important Directories

- Application: `/home/ayaeye/apps/aya-eye`
- Logs: `/home/ayaeye/apps/aya-eye/logs`
- Nginx config: `/etc/nginx/sites-available/aya-eye`
- Database backups: `/var/backups/ayaeye`

### Important Commands

```bash
# Application
pm2 restart aya-eye          # Restart app
pm2 logs aya-eye             # View logs
npm run build                # Build app

# Database
npx prisma migrate deploy    # Run migrations
npx prisma studio            # Open Prisma Studio

# Nginx
sudo nginx -t                # Test config
sudo systemctl reload nginx  # Reload config

# System
sudo systemctl status postgresql  # Check PostgreSQL
sudo systemctl restart postgresql # Restart PostgreSQL
```

---

## Support

For issues or questions:
1. Check application logs: `pm2 logs aya-eye`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Review this deployment guide
4. Check GitHub issues (if applicable)

---

**Last Updated:** 2026-02-17
