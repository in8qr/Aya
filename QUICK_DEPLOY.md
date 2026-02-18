# Quick Deployment Guide

This is a condensed version of the full deployment guide. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

> **Existing server with other apps/data?** Use [EXISTING_SERVER_DEPLOYMENT.md](./EXISTING_SERVER_DEPLOYMENT.md) instead — do not run full server setup scripts or format disks.

## Prerequisites

- Ubuntu 22.04+ or Debian 12+ server
- Root/sudo access
- Domain name (optional, can use IP address)

## Quick Setup (5 Steps)

### 1. Run Server Setup Script

```bash
# On your Linux server, as root:
sudo bash <(curl -s https://raw.githubusercontent.com/yourrepo/aya-eye/main/scripts/setup-server.sh)
# OR if you've already copied files:
cd /path/to/AyaEye
sudo bash scripts/setup-server.sh
```

This installs:
- Node.js 20.x
- PostgreSQL
- Nginx
- PM2
- Docker (for MinIO)

### 2. Deploy Application

```bash
# Switch to application user
sudo su - ayaeye

# Clone or copy your project
mkdir -p ~/apps
cd ~/apps
git clone YOUR_REPO_URL aya-eye
cd aya-eye

# OR copy files from your local machine:
# scp -r /path/to/AyaEye ayaeye@YOUR_SERVER:~/apps/aya-eye
```

### 3. Configure Environment

```bash
cd ~/apps/aya-eye
cp .env.example .env
nano .env  # Edit with your production values
```

**Required changes:**
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your domain or IP
- `NEXTAUTH_SECRET` - Run `openssl rand -base64 32`
- `RESEND_API_KEY` - Your Resend API key
- `EMAIL_FROM` - Your email address
- S3/MinIO credentials

### 4. Setup Database & Build

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push
npm run db:seed  # Optional: creates initial admin account

# Build application
npm run build
```

### 5. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable on boot

# Setup Nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/aya-eye
sudo nano /etc/nginx/sites-available/aya-eye  # Edit server_name
sudo ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Optional: Setup MinIO (Local Storage)

```bash
# Start MinIO
docker compose -f docker-compose.prod.yml up -d

# Access console at http://YOUR_SERVER_IP:9001
# Create buckets: aya-portfolio (public) and aya-receipts (private)
```

## Optional: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Verify Deployment

1. Check application: `pm2 status`
2. View logs: `pm2 logs aya-eye`
3. Test website: Visit `http://YOUR_SERVER_IP` or your domain
4. Login with seed account: `aya@ayaphotography.com` / `Admin123!`

## Common Commands

```bash
# Restart application
pm2 restart aya-eye

# View logs
pm2 logs aya-eye

# Update application
cd ~/apps/aya-eye
git pull
npm install
npm run build
pm2 restart aya-eye

# Backup database
./scripts/backup.sh

# Deploy updates
./scripts/deploy.sh
```

## Troubleshooting

**Application won't start:**
```bash
pm2 logs aya-eye  # Check logs
npx prisma db pull  # Test database connection
```

**502 Bad Gateway:**
```bash
pm2 status  # Check if app is running
sudo tail -f /var/log/nginx/error.log  # Check Nginx errors
```

**Database connection failed:**
```bash
sudo systemctl status postgresql
psql -h localhost -U ayaeye -d aya_photography
```

For more details, see [DEPLOYMENT.md](./DEPLOYMENT.md).
