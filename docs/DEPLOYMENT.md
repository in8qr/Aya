# Deployment instructions and commands

This document lists the main deployment steps and commands for Aya Eye. For environment variables, see [ENV-SETUP.md](ENV-SETUP.md).

---

## Quick reference (production server)

Run these from the **app directory** — the folder that contains `.env`, `package.json`, and `prisma/schema.prisma` (e.g. `~/apps/aya-eye/aya-eye` or `~/aya-eye`). If you see `DATABASE_URL` or `.env: No such file or directory`, you are likely in the wrong directory or `.env` has not been created yet (see [1.3](#13-environment-file) and [Troubleshooting](#troubleshooting)).

| Task | Command |
|------|--------|
| Load env and apply schema | `source .env` then `npx prisma db push` |
| Apply schema only | `npx prisma db push` |
| Seed (bootstrap IT admin) | `npm run db:seed` |
| Build | `npm run build` |
| Start app (once) | `npm start` |
| Start with PM2 | `pm2 start ecosystem.config.js` |
| Restart with PM2 | `pm2 restart aya-eye` |
| Full deploy (pull, install, schema, build, PM2 restart) | `./scripts/deploy.sh` |
| System update + deploy (as root) | `sudo ./scripts/update-and-deploy.sh` |

---

## 1. One-time setup on the server

### 1.1 Clone and install Node

```bash
# Clone (adjust path and repo URL as needed)
git clone https://github.com/in8qr/Aya.git aya-eye
cd aya-eye
```

Install Node.js 20 (Debian/Ubuntu):

```bash
# Option A: NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Option B: nvm (as app user)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

```bash
npm install
```

### 1.2 PostgreSQL

If you use **native PostgreSQL** (not Docker):

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres createuser -P ms
sudo -u postgres createdb -O ms aya_eye
```

If Docker is using port 5432 and you want native Postgres for the app, run native Postgres on another port (e.g. 5433) and use that in `DATABASE_URL`. See [ENV-SETUP.md](ENV-SETUP.md) for the exact URL format.

### 1.3 Environment file

The app and Prisma **must** have a `.env` file in the **same directory** as `package.json`. If `.env` is missing, `source .env` fails and Prisma will report `Environment variable not found: DATABASE_URL`.

```bash
# From the app directory (where package.json and prisma/ live)
cp .env.example .env
nano .env
```

Set at least:

- `DATABASE_URL` — e.g. `postgresql://ms:YOUR_PASSWORD@localhost:5432/aya_eye` or `postgresql://ms:YOUR_PASSWORD@localhost:5433/aya_eye` (if using port 5433)
- `NEXTAUTH_URL` — e.g. `https://yourdomain.com`
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` — same as `NEXTAUTH_URL`
- SMTP and S3/MinIO as needed (see [ENV-SETUP.md](ENV-SETUP.md))

### 1.4 Database schema and seed

Ensure you are in the app directory and `.env` exists. Prisma loads `.env` from the current working directory when you run `npx prisma …`.

```bash
# From the app directory (must contain .env)
npx prisma generate
npx prisma db push
npm run db:seed
```

If you get `Environment variable not found: DATABASE_URL`, run `ls -la .env` in that directory; if it’s missing, create it with `cp .env.example .env` and fill in `DATABASE_URL` (see [1.3](#13-environment-file)).

### 1.5 Build and run with PM2

```bash
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints so PM2 starts on boot
```

The app runs on the port set in `ecosystem.config.js` (default **3001**). Point Nginx or your reverse proxy to that port (e.g. `http://127.0.0.1:3001`).

---

## 2. Redeploy (after code changes)

### Option A: Deploy script (recommended)

From the app directory, as the app user:

```bash
cd ~/apps/aya-eye/aya-eye   # or your app path
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

This will:

1. Pull latest from `origin/main` (or `DEPLOY_BRANCH`)
2. Run `npm ci`
3. Run `npx prisma generate`
4. Run migrations (if `prisma/migrations` exists) or `npx prisma db push`
5. Run `npm run build`
6. Restart the app with PM2 (`pm2 restart ecosystem.config.js` or `pm2 start`)

To use a different branch:

```bash
DEPLOY_BRANCH=feature/my-branch ./scripts/deploy.sh
```

### Option B: Update system packages then deploy (as root)

From the app directory:

```bash
sudo ./scripts/update-and-deploy.sh
```

This runs `apt-get update && apt-get upgrade`, then runs `./scripts/deploy.sh` as the user who invoked `sudo` (e.g. `ms`).

### Option C: Manual commands

```bash
cd ~/apps/aya-eye/aya-eye
source .env
git fetch origin main
git reset --hard origin/main
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 restart aya-eye
```

---

## 3. Useful PM2 commands

| Command | Description |
|--------|-------------|
| `pm2 status` | List processes (e.g. `aya-eye`) |
| `pm2 restart aya-eye` | Restart the app |
| `pm2 stop aya-eye` | Stop the app |
| `pm2 start ecosystem.config.js` | Start using config (if not already running) |
| `pm2 logs aya-eye` | Stream logs |
| `pm2 logs aya-eye --lines 100` | Last 100 lines |
| `pm2 save` | Save process list for restart on reboot |
| `pm2 startup` | Print command to enable PM2 on boot |

---

## 4. After schema changes (new tables/columns)

If you added or changed Prisma models (e.g. after merging a feature):

```bash
cd ~/apps/aya-eye/aya-eye
source .env
npx prisma generate
npx prisma db push
pm2 restart aya-eye
```

Use `npx prisma migrate deploy` instead of `db push` if you use migrations.

---

## 5. Nginx and HTTPS (optional)

Example: proxy the app and get a certificate with Let’s Encrypt.

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

In your Nginx server block for the app, proxy to the port in `ecosystem.config.js` (e.g. 3001):

```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 6. First login

- Open the app in the browser (e.g. `https://yourdomain.com`).
- Log in with **ITAdmin:** `itadmin@ayaphotography.com` / `ITAdmin123!`
- Go to **Admin → Team** and add the main admin and team accounts. Then use **Admin → Appearance** for hero image and moving photos.

---

## 7. Logs

- **App log file:** `logs/app.log` in the project directory.
- **PM2 logs:** `pm2 logs aya-eye` or `./logs/pm2-out.log`, `./logs/pm2-error.log`.
- **Deploy log:** `logs/deploy.log` after running `./scripts/deploy.sh`.

---

## Troubleshooting

### `.env: No such file or directory` or `Environment variable not found: DATABASE_URL`

- You are either in the **wrong directory** or **`.env` does not exist** there.
- The app directory is the one that contains `package.json`, `prisma/schema.prisma`, and (after setup) `.env`. Avoid nested paths like `aya-eye/aya-eye/aya-eye`; use the single repo root (e.g. `~/apps/aya-eye/aya-eye`).
- **Fix:**
  ```bash
  cd /path/to/aya-eye   # e.g. cd ~/apps/aya-eye/aya-eye (one level, not repeated)
  ls -la .env           # if missing:
  cp .env.example .env
  nano .env             # set DATABASE_URL and other vars (see ENV-SETUP.md)
  npx prisma generate
  npx prisma db push
  npm run db:seed
  ```

### `role "ms" already exists` / `database "aya_eye" already exists`

- The user and database are already created. Use your existing password in `DATABASE_URL` in `.env` and continue with `npx prisma db push` and `npm run db:seed`.

### Build fails: `Cannot find module '@/components/home/moving-photos-carousel'`

- The homepage imports the moving-photos carousel, but the carousel component or lib is missing in the branch you deployed.
- **Fix:** Either deploy the branch that includes the full carousel feature (e.g. `feature/moving-photos`), or use the default branch that does not depend on the carousel (homepage shows only hero + footer section).

### Build error path shows `./aya-eye/aya-eye/src/...` or build uses old code

**Root cause:** Next.js reports file paths relative to the **current working directory (cwd)** when you run `npm run build`. If the error points at `./aya-eye/aya-eye/src/...`, then cwd is **two levels above** `src/` (e.g. you ran `npm run build` from `~/apps/aya-eye` instead of `~/apps/aya-eye/aya-eye`). The directory that actually gets compiled may be a nested copy that was never updated by `git pull`, so you see type errors (e.g. Zod `flatten().message`) that are already fixed in the repo.

**Fix:**

1. **Run both `git pull` and `npm run build` from the app root** — the directory that contains `package.json`, `src/`, and `next.config.ts` (e.g. `~/apps/aya-eye/aya-eye`).
2. The build script now runs `scripts/ensure-app-root.js` first; if you're in the wrong directory, it will exit with a clear message instead of compiling the wrong tree.
3. From the correct app root: `git pull origin main`, then `rm -rf .next && npm run build && pm2 restart aya-eye`.

### `EACCES: permission denied` when running `npm install -g pm2`

- Installing globally requires write access to Node’s global directory.
- **Fix:** Use `sudo npm install -g pm2`, or install PM2 only for your user: `npm install -g pm2` from a directory where you have write access (e.g. after configuring npm’s global prefix to your home), or run PM2 via npx: `npx pm2 start ecosystem.config.js`.
