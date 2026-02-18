# Deployment Checklist

Use this checklist to ensure a complete and secure deployment.

## Pre-Deployment

- [ ] Server meets minimum requirements (2GB RAM, 2 CPU cores, 20GB storage)
- [ ] Server has Ubuntu 22.04+ or Debian 12+
- [ ] You have root/sudo access
- [ ] Domain name configured (optional, can use IP)
- [ ] DNS records point to server IP (if using domain)

## Server Setup

- [ ] Run `scripts/setup-server.sh` or manually install:
  - [ ] Node.js 20.x
  - [ ] PostgreSQL 14+
  - [ ] Nginx
  - [ ] PM2
  - [ ] Docker (if using MinIO)
- [ ] Created application user (`ayaeye`)
- [ ] Firewall configured (UFW)
  - [ ] SSH (port 22) allowed
  - [ ] HTTP (port 80) allowed
  - [ ] HTTPS (port 443) allowed

## Application Deployment

- [ ] Application code deployed to server
- [ ] `.env` file created from `.env.example`
- [ ] All environment variables configured:
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `NEXTAUTH_URL` - Production URL
  - [ ] `NEXTAUTH_SECRET` - Strong random secret (32+ chars)
  - [ ] `RESEND_API_KEY` - Email service API key
  - [ ] `EMAIL_FROM` - Sender email address
  - [ ] S3/MinIO credentials configured
  - [ ] `NEXT_PUBLIC_APP_URL` - Public app URL
- [ ] Dependencies installed (`npm install`)
- [ ] Prisma Client generated (`npx prisma generate`)
- [ ] Database schema pushed (`npx prisma db push`)
- [ ] Database seeded (optional, `npm run db:seed`)
- [ ] Application built (`npm run build`)
- [ ] Application started with PM2 (`pm2 start ecosystem.config.js`)
- [ ] PM2 configured to start on boot (`pm2 startup`)

## Database Setup

- [ ] PostgreSQL installed and running
- [ ] Database created (`aya_photography`)
- [ ] Database user created with proper permissions
- [ ] Database connection tested
- [ ] Automated backups configured (`scripts/backup.sh` + cron)

## Storage Setup

**If using MinIO:**
- [ ] MinIO container running (`docker compose -f docker-compose.prod.yml up -d`)
- [ ] MinIO console accessible (http://localhost:9001)
- [ ] Bucket `aya-portfolio` created (public access)
- [ ] Bucket `aya-receipts` created (private access)
- [ ] MinIO credentials updated in `.env`

**If using AWS S3:**
- [ ] AWS account configured
- [ ] S3 buckets created (`aya-portfolio`, `aya-receipts`)
- [ ] IAM user created with S3 permissions
- [ ] Bucket policies configured:
  - [ ] `aya-portfolio` - Public read access
  - [ ] `aya-receipts` - Private (no public access)
- [ ] AWS credentials configured in `.env`

## Web Server (Nginx)

- [ ] Nginx installed and running
- [ ] Configuration file created (`/etc/nginx/sites-available/aya-eye`)
- [ ] Server name configured (domain or IP)
- [ ] Symlink created (`/etc/nginx/sites-enabled/aya-eye`)
- [ ] Nginx configuration tested (`nginx -t`)
- [ ] Nginx reloaded (`systemctl reload nginx`)
- [ ] Application accessible via HTTP

## SSL/HTTPS (Recommended)

- [ ] Certbot installed
- [ ] SSL certificate obtained (`certbot --nginx -d yourdomain.com`)
- [ ] HTTPS server block configured in Nginx
- [ ] HTTP redirects to HTTPS
- [ ] SSL auto-renewal tested (`certbot renew --dry-run`)
- [ ] Application accessible via HTTPS

## Security

- [ ] All default passwords changed:
  - [ ] PostgreSQL user password
  - [ ] MinIO root password (if using MinIO)
  - [ ] Application user password
- [ ] Strong `NEXTAUTH_SECRET` generated
- [ ] `.env` file permissions restricted (`chmod 600 .env`)
- [ ] Firewall enabled and configured
- [ ] SSH key-based authentication enabled (recommended)
- [ ] Root login disabled (if applicable)
- [ ] System packages updated (`apt update && apt upgrade`)
- [ ] Security headers configured in Nginx (HTTPS)

## Monitoring & Maintenance

- [ ] PM2 monitoring configured (`pm2 monit`)
- [ ] Log rotation configured
- [ ] Backup script tested (`scripts/backup.sh`)
- [ ] Backup cron job configured (daily at 2 AM)
- [ ] Monitoring tools installed (optional: htop, netdata, etc.)
- [ ] Application logs accessible (`pm2 logs aya-eye`)

## Testing

- [ ] Application starts successfully
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] User login works
- [ ] Admin dashboard accessible
- [ ] Team dashboard accessible
- [ ] Booking form works
- [ ] File uploads work (portfolio images)
- [ ] Email sending works (test email)
- [ ] Database operations work
- [ ] All pages load without errors
- [ ] Mobile responsiveness checked

## Documentation

- [ ] Deployment documentation reviewed
- [ ] Team members have access to:
  - [ ] Server credentials (secure method)
  - [ ] Database credentials
  - [ ] Application admin account
  - [ ] Deployment procedures
- [ ] Emergency contacts documented
- [ ] Rollback procedure documented

## Post-Deployment

- [ ] Initial admin account created/tested
- [ ] Test booking created
- [ ] Email notifications tested
- [ ] File uploads tested
- [ ] Performance monitoring enabled
- [ ] Error tracking configured (optional)
- [ ] Regular maintenance schedule established

## Notes

- **Date:** ________________
- **Deployed by:** ________________
- **Server IP/Domain:** ________________
- **Environment:** Production / Staging
- **Additional notes:**

---

**Next Steps:**
1. Monitor application for first 24-48 hours
2. Set up regular backups
3. Schedule regular security updates
4. Document any custom configurations
5. Train team on deployment process
