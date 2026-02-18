# Deploying Aya Eye on an Existing Server

This guide covers adding Aya Eye to a server that **already runs other applications**, has **existing data on drives**, and may use **Docker, Cloudflare Tunnel, Nginx, or other reverse proxies**.

**Do not use:** [COMPLETE_SERVER_SETUP.md](./COMPLETE_SERVER_SETUP.md) disk partitioning/formatting sections — those are for empty disks only.

---

## Table of Contents

1. [Principles](#principles)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Choosing Install Location](#choosing-install-location)
4. [Software Requirements (Add-Only)](#software-requirements-add-only)
5. [Database Setup (Coexisting)](#database-setup-coexisting)
6. [Application Deployment](#application-deployment)
7. [Storage (MinIO) on Existing Docker Host](#storage-minio-on-existing-docker-host)
8. [Reverse Proxy / Cloudflare Tunnel](#reverse-proxy--cloudflare-tunnel)
9. [Firewall and Networking](#firewall-and-networking)
10. [Process Management](#process-management)
11. [Backups (Non-Destructive)](#backups-non-destructive)
12. [Troubleshooting](#troubleshooting)

---

## Principles

- **Do not format, repartition, or overwrite** any existing drives or data.
- **Do not replace** existing Nginx, Cloudflare Tunnel, or reverse proxy configs; **add** to them.
- **Do not change** existing firewall rules blindly; add only what Aya Eye needs.
- **Use a dedicated directory** for Aya Eye (app code, data, backups) that does not conflict with existing services.
- **Use existing Docker/Podman** for MinIO if you already run containers; add Aya Eye’s services alongside.
- **Use existing PostgreSQL** if present; create a new database and user only.

---

## Pre-Deployment Checklist

Before running any commands:

- [ ] You have SSH access and sudo (or root).
- [ ] You know where other apps and data live (e.g. `lsblk`, `df -h`, `docker ps`, `docker volume ls`).
- [ ] You have identified:
  - A directory for Aya Eye app code (e.g. `/opt/aya-eye`, `~/apps/aya-eye`, or a path on an existing data volume).
  - Where to put Aya Eye data/backups (e.g. a subdirectory on an existing mounted drive).
- [ ] You know how external access works: **Cloudflare Tunnel**, Nginx, Caddy, or other reverse proxy.
- [ ] You have a **subdomain or path** for Aya Eye (e.g. `aya.yourdomain.com` or `yourdomain.com/aya`).
- [ ] You will **not** run scripts that format disks or overwrite existing configs (e.g. skip `setup-complete-server.sh` disk/format steps).

---

## Choosing Install Location

Pick a path that does **not** overwrite existing apps or system paths.

**Option A – On existing data mount (recommended if you have a data volume)**

```bash
# Example: existing media/data at /mnt/data or /mnt/storage
# Create a dedicated folder for Aya Eye
sudo mkdir -p /mnt/data/aya-eye/app
sudo mkdir -p /mnt/data/aya-eye/minio
sudo mkdir -p /mnt/data/aya-eye/backups
sudo mkdir -p /mnt/data/aya-eye/logs

# Set ownership (replace 'youruser' with the user that will run the app)
sudo chown -R youruser:youruser /mnt/data/aya-eye
```

**Option B – Under /opt (no extra disk)**

```bash
sudo mkdir -p /opt/aya-eye/{app,minio,backups,logs}
sudo chown -R youruser:youruser /opt/aya-eye
```

**Option C – User home**

```bash
mkdir -p ~/apps/aya-eye
# MinIO/data can stay in ~/apps/aya-eye/minio or on an existing volume
```

Use one `APP_ROOT` consistently (e.g. `/mnt/data/aya-eye/app` or `/opt/aya-eye/app`). All following steps refer to `APP_ROOT` as the directory containing the Aya Eye repo (package.json, prisma, src, etc.).

---

## Software Requirements (Add-Only)

Install **only** what is missing. Do not reinstall or reconfigure existing stack.

```bash
# Node.js 20.x (only if not already installed)
command -v node >/dev/null 2>&1 || {
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
}
node --version   # expect v20.x

# PostgreSQL client (for migrations) — often already present
sudo apt install -y postgresql-client

# PM2 (only if you run Node apps with PM2; otherwise use systemd or Docker)
command -v pm2 >/dev/null 2>&1 || sudo npm install -g pm2
```

- **PostgreSQL:** If the server already runs PostgreSQL, skip “Install PostgreSQL” and only create a new DB and user (see below).
- **Nginx:** Do **not** replace existing Nginx configs; add a new server block or include file for Aya Eye only.
- **Docker:** If Docker is already in use for other services, use it for MinIO only; do not run a full “setup server” script that might alter Docker’s installation.

---

## Database Setup (Coexisting)

Use the **existing** PostgreSQL instance. Create a **new** database and user so other apps are unaffected.

```bash
# Connect to existing PostgreSQL (adjust if you use a different user/socket)
sudo -u postgres psql << 'EOF'
CREATE DATABASE aya_photography;
CREATE USER ayaeye WITH PASSWORD 'YOUR_SECURE_PASSWORD';
ALTER ROLE ayaeye SET client_encoding TO 'utf8';
ALTER ROLE ayaeye SET default_transaction_isolation TO 'read committed';
ALTER ROLE ayaeye SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE aya_photography TO ayaeye;
\c aya_photography
GRANT ALL ON SCHEMA public TO ayaeye;
EOF
```

If PostgreSQL is in Docker, use the same host/port you use for other DBs and run the same SQL (e.g. via `docker exec` or a DB client). Set `DATABASE_URL` in Aya Eye’s `.env` to this database only.

---

## Application Deployment

```bash
# 1. Go to your chosen app root
cd /mnt/data/aya-eye/app   # or /opt/aya-eye/app or ~/apps/aya-eye

# 2. Clone repo (or copy files)
git clone https://github.com/yourusername/aya-eye.git .
# or: scp/rsync from your machine

# 3. Environment
cp .env.example .env
nano .env
```

Set at least:

- `DATABASE_URL` — connection string to the **new** DB (e.g. `postgresql://ayaeye:PASSWORD@localhost:5432/aya_photography`)
- `NEXTAUTH_URL` — public URL for Aya Eye (e.g. `https://aya.yourdomain.com`)
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `RESEND_API_KEY`, `EMAIL_FROM`
- S3/MinIO vars (see below)
- `NEXT_PUBLIC_APP_URL` — same as `NEXTAUTH_URL`

```bash
# 4. Install and build
npm install --production=false
npx prisma generate
npx prisma db push
npm run db:seed   # optional

# 5. Build
npm run build
```

---

## Storage (MinIO) on Existing Docker Host

If Docker is already used for other services:

- Use a **dedicated directory** for MinIO data (e.g. `/mnt/data/aya-eye/minio` or a path on an existing data volume). Do **not** use a volume that belongs to other apps.
- Run only the **MinIO** service from Aya Eye’s compose file, or merge MinIO into your existing compose with a new volume and container name to avoid conflicts.

Example: use a bind mount to your chosen path.

```yaml
# Example: add to your existing docker-compose or use a separate file
services:
  ayaeye-minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - /mnt/data/aya-eye/minio:/data   # or your chosen path
    ports:
      - "127.0.0.1:9000:9000"
      - "127.0.0.1:9001:9001"
    networks:
      - your_existing_network   # use an existing internal network if you have one
```

- Create buckets `aya-portfolio` and `aya-receipts` (MinIO console or mc).
- In Aya Eye `.env` set `S3_ENDPOINT=http://localhost:9000` (or the container name if app runs in Docker and same network). If Aya Eye runs on the host, `localhost` is correct.

---

## Reverse Proxy / Cloudflare Tunnel

Add Aya Eye **alongside** existing routing. Do **not** replace existing configs.

### If you use Cloudflare Tunnel (cloudflared)

- Add a new **Public Hostname** (or new ingress rule) for the Aya Eye subdomain, e.g.:
  - Subdomain: `aya` (or `photos`, etc.)
  - Service: `http://localhost:3000` (or the host/port where Aya Eye listens)

No Nginx change needed if the tunnel points directly at the app. Ensure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` use that full URL (e.g. `https://aya.yourdomain.com`).

### If you use Nginx (or Nginx Proxy Manager) in front of the tunnel or internet

- Add a **new** server block (or new proxy host) for Aya Eye only:

```nginx
# New file, e.g. /etc/nginx/sites-available/aya-eye
# Or append to existing config — do not overwrite existing server blocks

server {
    listen 80;
    server_name aya.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_cache_bypass $http_upgrade;
    }

    client_max_body_size 50M;
}
```

- Enable only this site:  
  `sudo ln -s /etc/nginx/sites-available/aya-eye /etc/nginx/sites-enabled/`  
  Then `sudo nginx -t` and `sudo systemctl reload nginx`.

If SSL is handled by Cloudflare or another layer, the above may be enough. If Nginx terminates SSL, add a `listen 443 ssl` block and certificate paths as in your other configs.

---

## Firewall and Networking

- **Do not** run a firewall script that resets or replaces existing UFW/iptables rules.
- **Add** only what Aya Eye needs. If the app is reached only via Cloudflare Tunnel or Nginx on 80/443, no new public ports are required; ensure Nginx/tunnel can reach `127.0.0.1:3000`.
- If you open a port, prefer restricting to loopback or VPN:

```bash
# Only if you must expose 3000 (e.g. for a reverse proxy on same host)
sudo ufw allow from 127.0.0.1 to any port 3000 comment 'Aya Eye local'
sudo ufw reload
```

---

## Process Management

Run Aya Eye with your existing pattern:

- **PM2 (if you already use it):**

```bash
cd /mnt/data/aya-eye/app   # or your APP_ROOT
pm2 start ecosystem.config.js
# Or: pm2 start npm --name aya-eye -- start
pm2 save
```

- **systemd:** Use a new unit file (e.g. `aya-eye.service`) that runs `npm start` in `APP_ROOT`, and do not modify other services’ units.

- **Docker:** You can run the Node app in a container on your existing Docker network and point Cloudflare Tunnel or Nginx at that container’s port. Use a dedicated Dockerfile and compose service name (e.g. `aya-eye-app`) so it doesn’t conflict with existing stacks.

---

## Backups (Non-Destructive)

- **Database:** Dump only the Aya Eye DB:

```bash
pg_dump -h localhost -U ayaeye aya_photography > /mnt/data/aya-eye/backups/aya_photography_$(date +%Y%m%d).sql
```

- **MinIO:** Backup only the Aya Eye MinIO data directory (e.g. `/mnt/data/aya-eye/minio`) with `tar` or your existing backup tool; do not include other services’ data.
- **App:** Backup only `APP_ROOT` (and `.env` securely). Do not overwrite backups of other applications.

Add a cron job or use your existing backup scheduler; keep retention consistent with the rest of your server.

---

## Troubleshooting

- **Port 3000 in use:** Run Aya Eye on another port (e.g. `PORT=3001 npm start`) and point Nginx/tunnel at that port; do not stop other services without checking.
- **Database connection refused:** Confirm PostgreSQL is running and that `DATABASE_URL` uses the correct host/port and the `aya_photography` database.
- **MinIO connection refused:** Ensure the MinIO container is running and that the host/port in `S3_ENDPOINT` is correct (e.g. `http://localhost:9000` when app runs on host).
- **502 from Nginx/tunnel:** Ensure the Aya Eye process is running (e.g. `pm2 status` or `systemctl status aya-eye`) and listening on the port Nginx/tunnel uses.

---

## Summary

| Topic              | Action                                                                 |
|--------------------|-----------------------------------------------------------------------|
| Disks              | Do not format or repartition; use an existing path for Aya Eye only.  |
| Directories        | Create dedicated dirs (app, minio, backups, logs) under one root.      |
| PostgreSQL         | Create new DB and user on existing instance.                           |
| Docker             | Add MinIO (and optional app container) with new volumes/networks.      |
| Nginx / Tunnel     | Add new hostname or ingress for Aya Eye; do not replace existing.    |
| Firewall           | Add minimal rules if needed; do not reset existing rules.              |
| Backups            | Backup only Aya Eye DB, MinIO data, and app directory.                 |

For a **greenfield** server (no existing apps/data), use [COMPLETE_SERVER_SETUP.md](./COMPLETE_SERVER_SETUP.md) or [DEPLOYMENT.md](./DEPLOYMENT.md) instead.
