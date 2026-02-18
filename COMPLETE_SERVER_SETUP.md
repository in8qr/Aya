# Complete Linux Server Setup Guide

This guide covers everything from scratch: disk mounting, networking, Cloudflare setup, and application deployment.

> **Already have a server with other apps and data?**  
> **Do not** format or repartition disks, or overwrite existing configs. Use **[EXISTING_SERVER_DEPLOYMENT.md](./EXISTING_SERVER_DEPLOYMENT.md)** instead to add Aya Eye alongside your current stack (Docker, Nginx, Cloudflare Tunnel, etc.).

## Table of Contents

1. [Initial Server Access](#initial-server-access)
2. [System Updates](#system-updates)
3. [Disk Partitioning & Mounting](#disk-partitioning--mounting)
4. [Network Configuration](#network-configuration)
5. [Firewall Setup](#firewall-setup)
6. [Software Installation](#software-installation)
7. [Cloudflare Configuration](#cloudflare-configuration)
8. [Application Deployment](#application-deployment)
9. [SSL/HTTPS Setup](#sslhttps-setup)

---

## Initial Server Access

### 1. Connect to Your Server

```bash
# SSH into your server (replace with your server IP)
ssh root@YOUR_SERVER_IP

# Or if you have a user account:
ssh username@YOUR_SERVER_IP
```

### 2. Check System Information

```bash
# Check OS version
cat /etc/os-release

# Check disk space
df -h

# Check available disks
lsblk

# Check network interfaces
ip addr show
```

---

## System Updates

```bash
# Update package list
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential htop nano ufw net-tools
```

---

## Disk Partitioning & Mounting

### 1. Identify Available Disks

```bash
# List all disks
lsblk

# Check disk details
fdisk -l

# Example output:
# /dev/sda - System disk (usually mounted)
# /dev/sdb - Additional disk for data (if available)
```

### 2. Format New Disk (if unformatted)

**⚠️ WARNING: This will erase all data on the disk. Only run if disk is new/unused.**

```bash
# Replace /dev/sdb with your actual disk
DISK="/dev/sdb"

# Check if disk has partitions
fdisk -l $DISK

# Create partition table and partition
fdisk $DISK
# Inside fdisk:
#   - Press 'n' (new partition)
#   - Press 'p' (primary partition)
#   - Press '1' (partition number)
#   - Press Enter (default first sector)
#   - Press Enter (default last sector)
#   - Press 'w' (write and exit)

# Format as ext4
mkfs.ext4 ${DISK}1

# Label the disk (optional, helps identify it)
e2label ${DISK}1 ayaeye-data
```

### 3. Create Mount Point and Mount Disk

```bash
# Create mount directory for application data
mkdir -p /mnt/ayaeye-data

# Mount the disk
mount ${DISK}1 /mnt/ayaeye-data

# Verify mount
df -h /mnt/ayaeye-data
```

### 4. Make Mount Permanent (fstab)

```bash
# Get UUID of the disk
blkid ${DISK}1

# Example output: /dev/sdb1: UUID="abc123..." TYPE="ext4"

# Backup fstab
cp /etc/fstab /etc/fstab.backup

# Add to fstab (replace UUID with actual UUID from blkid)
echo "UUID=YOUR_UUID_HERE /mnt/ayaeye-data ext4 defaults,nofail 0 2" >> /etc/fstab

# Test fstab (should not error)
mount -a

# Verify
df -h /mnt/ayaeye-data
```

### 5. Create Directory Structure

```bash
# Create directories for application
mkdir -p /mnt/ayaeye-data/{app,minio,backups,logs}

# Set permissions
chmod 755 /mnt/ayaeye-data
chmod 755 /mnt/ayaeye-data/*

# Create symlinks (optional, for easier access)
ln -s /mnt/ayaeye-data/app /opt/ayaeye-app
ln -s /mnt/ayaeye-data/minio /opt/ayaeye-minio
ln -s /mnt/ayaeye-data/backups /opt/ayaeye-backups
```

---

## Network Configuration

### 1. Check Current Network Configuration

```bash
# View network interfaces
ip addr show

# View routing table
ip route show

# Check DNS settings
cat /etc/resolv.conf
```

### 2. Configure Static IP (if needed)

**Note: Most cloud providers handle this automatically. Only configure if using bare metal.**

```bash
# Edit network configuration (Ubuntu 22.04+)
nano /etc/netplan/00-installer-config.yaml
```

Example configuration:
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - YOUR_IP_ADDRESS/24
      gateway4: YOUR_GATEWAY
      nameservers:
        addresses:
          - 1.1.1.1  # Cloudflare DNS
          - 8.8.8.8  # Google DNS
```

```bash
# Apply network configuration
netplan apply

# Verify
ip addr show
```

### 3. Configure DNS (Cloudflare DNS)

```bash
# Edit resolv.conf
nano /etc/resolv.conf
```

Add:
```
nameserver 1.1.1.1
nameserver 1.0.0.1
nameserver 8.8.8.8
```

**For permanent DNS (Ubuntu 22.04+):**
```bash
# Edit netplan config
nano /etc/netplan/00-installer-config.yaml
# Add nameservers section (see above)

# Apply
netplan apply
```

### 4. Test Network Connectivity

```bash
# Test DNS resolution
nslookup google.com
nslookup yourdomain.com

# Test internet connectivity
ping -c 4 8.8.8.8
ping -c 4 google.com

# Test port connectivity
curl -I https://google.com
```

---

## Firewall Setup

### 1. Install and Configure UFW

```bash
# Install UFW (if not already installed)
apt install -y ufw

# Check UFW status
ufw status

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (IMPORTANT - do this first!)
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS
ufw allow 443/tcp

# If using MinIO console (only allow from localhost in production)
# ufw allow from 127.0.0.1 to any port 9001

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

### 2. Configure Firewall Rules for Cloudflare

**Important:** If using Cloudflare proxy, only allow Cloudflare IPs to access ports 80/443.

```bash
# Create script to update Cloudflare IPs
nano /usr/local/bin/update-cloudflare-ips.sh
```

```bash
#!/bin/bash
# Cloudflare IP ranges
# IPv4
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
    ufw allow from $ip to any port 80
    ufw allow from $ip to any port 443
done

# IPv6 (if needed)
for ip in $(curl -s https://www.cloudflare.com/ips-v6); do
    ufw allow from $ip to any port 80
    ufw allow from $ip to any port 443
done
```

```bash
# Make executable
chmod +x /usr/local/bin/update-cloudflare-ips.sh

# Run it
/usr/local/bin/update-cloudflare-ips.sh

# Add to crontab for updates (monthly)
(crontab -l 2>/dev/null; echo "0 0 1 * * /usr/local/bin/update-cloudflare-ips.sh") | crontab -
```

**Alternative (Simpler):** If you're using Cloudflare proxy, you can just allow all HTTP/HTTPS and let Cloudflare handle security:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## Software Installation

### 1. Install Node.js 20.x

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version
```

### 2. Install PostgreSQL

```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Check status
systemctl status postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE aya_photography;
CREATE USER ayaeye WITH PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
ALTER ROLE ayaeye SET client_encoding TO 'utf8';
ALTER ROLE ayaeye SET default_transaction_isolation TO 'read committed';
ALTER ROLE ayaeye SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aya_photography TO ayaeye;
\q
EOF

# Test connection
sudo -u postgres psql -c "\l" | grep aya_photography
```

### 3. Install Nginx

```bash
# Install Nginx
apt install -y nginx

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Check status
systemctl status nginx

# Test configuration
nginx -t
```

### 4. Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Verify installation
pm2 --version

# Setup PM2 startup script (run as root)
pm2 startup systemd -u root --hp /root
# Follow the instructions shown
```

### 5. Install Docker (for MinIO)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add user to docker group (if not root)
usermod -aG docker ayaeye

# Verify installation
docker --version
docker compose version
```

### 6. Create Application User

```bash
# Create application user
adduser --disabled-password --gecos "" ayaeye

# Add to sudo and docker groups
usermod -aG sudo,docker ayaeye

# Switch to application user
su - ayaeye

# Verify groups
groups
```

---

## Cloudflare Configuration

### 1. Add Domain to Cloudflare

1. Log in to Cloudflare dashboard: https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter your domain name
4. Select plan (Free plan works fine)
5. Cloudflare will scan your DNS records

### 2. Update Nameservers

Cloudflare will provide nameservers like:
- `ns1.cloudflare.com`
- `ns2.cloudflare.com`

**Update at your domain registrar:**
1. Log in to your domain registrar
2. Find DNS/Nameserver settings
3. Replace existing nameservers with Cloudflare's nameservers
4. Wait for propagation (can take up to 24 hours, usually 1-2 hours)

### 3. Configure DNS Records

In Cloudflare dashboard, go to **DNS** → **Records**:

**Add A Record:**
- **Type:** A
- **Name:** @ (or yourdomain.com)
- **IPv4 address:** YOUR_SERVER_IP
- **Proxy status:** 🟠 Proxied (orange cloud) - **IMPORTANT**
- **TTL:** Auto

**Add CNAME for www:**
- **Type:** CNAME
- **Name:** www
- **Target:** yourdomain.com (or @)
- **Proxy status:** 🟠 Proxied
- **TTL:** Auto

**Optional - Add subdomain for admin:**
- **Type:** A
- **Name:** admin
- **IPv4 address:** YOUR_SERVER_IP
- **Proxy status:** 🟠 Proxied
- **TTL:** Auto

### 4. SSL/TLS Settings

In Cloudflare dashboard, go to **SSL/TLS**:

1. **Overview:**
   - Set encryption mode to **"Full"** or **"Full (strict)"**
   - This ensures encrypted connection between Cloudflare and your server

2. **Edge Certificates:**
   - **Always Use HTTPS:** ON
   - **Automatic HTTPS Rewrites:** ON
   - **Minimum TLS Version:** 1.2

3. **Origin Server:**
   - We'll set up Let's Encrypt certificate on server (see SSL section)

### 5. Cloudflare Security Settings

**Security → WAF:**
- Enable basic security rules (free plan includes basic WAF)

**Security → Bot Fight Mode:**
- Enable (free) or configure as needed

**Speed → Optimization:**
- Enable Auto Minify (HTML, CSS, JS)
- Enable Brotli compression

**Caching:**
- Set caching level to "Standard"
- Browser Cache TTL: 4 hours (or as needed)

### 6. Get Cloudflare Origin Certificate (Optional but Recommended)

**SSL/TLS → Origin Server:**

1. Click "Create Certificate"
2. Select:
   - Private key type: RSA (2048)
   - Hostnames: `yourdomain.com`, `*.yourdomain.com`
   - Certificate Validity: 15 years
3. Copy the **Origin Certificate** and **Private Key**
4. Save them on your server (we'll use them in Nginx config)

---

## Application Deployment

### 1. Clone/Copy Application

```bash
# Switch to application user
su - ayaeye

# Create application directory on mounted disk
mkdir -p /mnt/ayaeye-data/app
cd /mnt/ayaeye-data/app

# Clone repository (replace with your repo URL)
git clone https://github.com/yourusername/aya-eye.git .

# OR copy files from local machine:
# From your local machine:
# scp -r /path/to/AyaEye/* ayaeye@YOUR_SERVER_IP:/mnt/ayaeye-data/app/
```

### 2. Configure Environment

```bash
cd /mnt/ayaeye-data/app

# Copy environment file
cp .env.example .env

# Edit environment file
nano .env
```

**Configure `.env` with production values:**

```env
# Database
DATABASE_URL="postgresql://ayaeye:YOUR_SECURE_PASSWORD@localhost:5432/aya_photography"

# NextAuth
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxx"
EMAIL_FROM="Aya Eye <noreply@yourdomain.com>"

# S3/MinIO Storage
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="YOUR_SECURE_MINIO_PASSWORD"
S3_PORTFOLIO_BUCKET="aya-portfolio"
S3_RECEIPTS_BUCKET="aya-receipts"
S3_FORCE_PATH_STYLE="true"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 3. Install Dependencies and Setup Database

```bash
cd /mnt/ayaeye-data/app

# Install dependencies
npm install --production=false

# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database (optional)
npm run db:seed
```

### 4. Build Application

```bash
# Build Next.js application
npm run build

# Verify build
ls -la .next
```

### 5. Setup MinIO (on mounted disk)

```bash
# Create MinIO data directory on mounted disk
mkdir -p /mnt/ayaeye-data/minio/data

# Update docker-compose.prod.yml with correct volume path
cd /mnt/ayaeye-data/app
nano docker-compose.prod.yml
```

Update volume path:
```yaml
volumes:
  minio_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /mnt/ayaeye-data/minio/data
```

```bash
# Start MinIO
docker compose -f docker-compose.prod.yml up -d

# Check status
docker ps | grep minio

# Access MinIO console (from server only)
# http://localhost:9001
# Login with credentials from .env

# Create buckets via console or CLI:
docker run --rm -it \
  -e MINIO_SERVER_ENDPOINT=localhost:9000 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=YOUR_SECURE_MINIO_PASSWORD \
  minio/mc alias set local http://localhost:9000 minioadmin YOUR_SECURE_MINIO_PASSWORD

docker run --rm -it minio/mc mb local/aya-portfolio
docker run --rm -it minio/mc mb local/aya-receipts
docker run --rm -it minio/mc anonymous set download local/aya-portfolio
```

### 6. Start Application with PM2

```bash
cd /mnt/ayaeye-data/app

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow instructions (usually run as root)
```

---

## SSL/HTTPS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically configure Nginx

# Test auto-renewal
certbot renew --dry-run
```

### Option 2: Cloudflare Origin Certificate

If you created a Cloudflare Origin Certificate:

```bash
# Create directory for certificates
mkdir -p /etc/nginx/ssl

# Create certificate file
nano /etc/nginx/ssl/yourdomain.com.crt
# Paste Origin Certificate

# Create private key file
nano /etc/nginx/ssl/yourdomain.com.key
# Paste Private Key

# Set permissions
chmod 600 /etc/nginx/ssl/yourdomain.com.key
chmod 644 /etc/nginx/ssl/yourdomain.com.crt
```

### Configure Nginx

```bash
# Copy Nginx config
cp /mnt/ayaeye-data/app/nginx.conf.example /etc/nginx/sites-available/aya-eye

# Edit configuration
nano /etc/nginx/sites-available/aya-eye
```

Update with your domain and SSL paths:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # OR Cloudflare Origin Certificate:
    # ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
    # ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;  # Cloudflare
        proxy_cache_bypass $http_upgrade;
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }

    client_max_body_size 50M;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test configuration
nginx -t

# Reload Nginx
systemctl reload nginx
```

---

## Verify Deployment

### 1. Check Application Status

```bash
# Check PM2
pm2 status
pm2 logs aya-eye --lines 50

# Check Nginx
systemctl status nginx
nginx -t

# Check PostgreSQL
systemctl status postgresql

# Check Docker/MinIO
docker ps
```

### 2. Test Website

```bash
# Test locally
curl http://localhost:3000

# Test via domain
curl https://yourdomain.com

# Check DNS resolution
nslookup yourdomain.com
```

### 3. Check Cloudflare Status

In Cloudflare dashboard:
- **SSL/TLS:** Should show "Full" or "Full (strict)"
- **DNS:** Records should show 🟠 Proxied
- **Analytics:** Should show traffic

---

## Maintenance Commands

```bash
# Restart application
pm2 restart aya-eye

# View logs
pm2 logs aya-eye

# Update application
cd /mnt/ayaeye-data/app
git pull
npm install
npm run build
pm2 restart aya-eye

# Backup database
/usr/local/bin/backup-ayaeye.sh

# Check disk usage
df -h /mnt/ayaeye-data

# Check system resources
htop
free -h
```

---

## Troubleshooting

### Disk Not Mounting

```bash
# Check disk status
lsblk
blkid

# Check fstab
cat /etc/fstab

# Manual mount test
mount /dev/sdb1 /mnt/ayaeye-data

# Check logs
dmesg | grep -i error
journalctl -xe
```

### Network Issues

```bash
# Check network interfaces
ip addr show

# Restart networking
systemctl restart networking  # Debian
netplan apply  # Ubuntu

# Check DNS
nslookup yourdomain.com
dig yourdomain.com
```

### Cloudflare Issues

- **502 Bad Gateway:** Check if app is running (`pm2 status`)
- **SSL Errors:** Verify SSL mode is "Full" in Cloudflare
- **DNS Not Resolving:** Check nameservers at registrar

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs aya-eye

# Check environment
cd /mnt/ayaeye-data/app
cat .env

# Test database connection
npx prisma db pull

# Check Nginx logs
tail -f /var/log/nginx/error.log
```

---

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled (if applicable)
- [ ] Strong passwords for all services
- [ ] SSL/HTTPS configured
- [ ] Cloudflare security enabled
- [ ] Regular backups configured
- [ ] System updates scheduled
- [ ] File permissions set correctly
- [ ] Sensitive files (.env) protected (chmod 600)

---

**Last Updated:** 2026-02-17
