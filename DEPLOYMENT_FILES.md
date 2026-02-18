# Deployment Files Reference

This document describes all deployment-related files in the project.

## Documentation Files

### `DEPLOYMENT.md`
**Purpose:** Comprehensive deployment guide with detailed step-by-step instructions  
**Contents:**
- Server setup and prerequisites
- Application deployment process
- Database configuration
- Storage setup (MinIO/S3)
- Nginx reverse proxy configuration
- SSL/HTTPS setup with Let's Encrypt
- PM2 process management
- Monitoring and maintenance
- Troubleshooting guide
- Security checklist

**When to use:** Primary reference for deploying the application to Linux servers

### `QUICK_DEPLOY.md`
**Purpose:** Condensed 5-step quick deployment guide  
**Contents:**
- Quick setup script usage
- Essential configuration steps
- Common commands reference
- Basic troubleshooting

**When to use:** For experienced users or quick deployments

### `DEPLOYMENT_CHECKLIST.md`
**Purpose:** Pre-deployment and post-deployment checklist  
**Contents:**
- Pre-deployment requirements
- Server setup checklist
- Application deployment checklist
- Security checklist
- Testing checklist
- Post-deployment tasks

**When to use:** Before and during deployment to ensure nothing is missed

## Configuration Files

### `ecosystem.config.js`
**Purpose:** PM2 process manager configuration  
**Contents:**
- Application name and script
- Environment variables
- Log file locations
- Memory limits
- Auto-restart settings

**Usage:**
```bash
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js
```

### `docker-compose.prod.yml`
**Purpose:** Production MinIO Docker Compose configuration  
**Contents:**
- MinIO service definition
- Volume configuration
- Network setup
- Health checks
- Port bindings (localhost only for security)

**Usage:**
```bash
docker compose -f docker-compose.prod.yml up -d
```

### `nginx.conf.example`
**Purpose:** Nginx reverse proxy configuration template  
**Contents:**
- HTTP server block
- HTTPS server block (commented, for SSL setup)
- Proxy settings for Next.js
- File upload size limits
- Security headers

**Usage:**
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/aya-eye
sudo nano /etc/nginx/sites-available/aya-eye  # Edit server_name
sudo ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/
```

## Scripts

### `scripts/setup-server.sh`
**Purpose:** Automated server setup script  
**What it does:**
- Updates system packages
- Installs Node.js 20.x
- Installs PostgreSQL
- Installs Nginx
- Installs PM2
- Installs Docker
- Creates application user
- Configures firewall

**Usage:**
```bash
sudo bash scripts/setup-server.sh
```

**Requirements:** Run as root/sudo on fresh Ubuntu/Debian server

### `scripts/deploy.sh`
**Purpose:** Automated application deployment script  
**What it does:**
- Backs up current build
- Pulls latest code (if using git)
- Installs dependencies
- Generates Prisma Client
- Runs database migrations
- Builds application
- Restarts PM2 process

**Usage:**
```bash
cd ~/apps/aya-eye
./scripts/deploy.sh production
```

**Requirements:** Run as `ayaeye` user, requires `.env` file

**Note:** Make script executable: `chmod +x scripts/deploy.sh`

### `scripts/backup.sh`
**Purpose:** Automated backup script for database and MinIO  
**What it does:**
- Backs up PostgreSQL database
- Backs up MinIO data (if using Docker)
- Cleans up old backups (7+ days)
- Logs backup operations

**Usage:**
```bash
./scripts/backup.sh
```

**Cron setup (daily at 2 AM):**
```bash
0 2 * * * /home/ayaeye/apps/aya-eye/scripts/backup.sh
```

**Note:** Make script executable: `chmod +x scripts/backup.sh`

## Environment Files

### `.env.example`
**Purpose:** Environment variables template  
**Contents:**
- Database connection string
- NextAuth configuration
- Email service (Resend) credentials
- S3/MinIO storage configuration
- Application URL

**Usage:**
```bash
cp .env.example .env
nano .env  # Edit with production values
```

**Important:** Never commit `.env` file to version control

## File Structure

```
AyaEye/
├── DEPLOYMENT.md              # Comprehensive guide
├── QUICK_DEPLOY.md            # Quick reference
├── DEPLOYMENT_CHECKLIST.md    # Deployment checklist
├── DEPLOYMENT_FILES.md         # This file
├── ecosystem.config.js         # PM2 config
├── docker-compose.prod.yml     # Production MinIO
├── nginx.conf.example          # Nginx template
├── scripts/
│   ├── setup-server.sh        # Server setup
│   ├── deploy.sh              # App deployment
│   └── backup.sh              # Backup script
└── .env.example               # Environment template
```

## Quick Start Workflow

1. **Server Setup:**
   ```bash
   sudo bash scripts/setup-server.sh
   ```

2. **Deploy Application:**
   ```bash
   sudo su - ayaeye
   cd ~/apps/aya-eye
   cp .env.example .env
   nano .env  # Configure
   npm install
   npx prisma generate && npx prisma db push
   npm run build
   pm2 start ecosystem.config.js
   ```

3. **Configure Nginx:**
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/aya-eye
   sudo nano /etc/nginx/sites-available/aya-eye
   sudo ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Setup SSL (Optional):**
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

5. **Setup Backups:**
   ```bash
   chmod +x scripts/backup.sh
   crontab -e
   # Add: 0 2 * * * /home/ayaeye/apps/aya-eye/scripts/backup.sh
   ```

## Making Scripts Executable

On Linux, make scripts executable:
```bash
chmod +x scripts/*.sh
```

## Notes

- All scripts include error handling and logging
- Scripts are designed to be idempotent (safe to run multiple times)
- Backup script requires sudo for database backups
- Deployment script backs up current build before deploying
- All sensitive data should be in `.env` (never committed)

## Support

For issues:
1. Check script logs
2. Review `DEPLOYMENT.md` troubleshooting section
3. Check application logs: `pm2 logs aya-eye`
4. Check system logs: `journalctl -u nginx`, `journalctl -u postgresql`
