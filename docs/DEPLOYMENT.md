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

## Development app (AyaDev) — same machine, different port

The **AyaDev** branch runs a separate instance of the app for trying new features. It uses the **same database** as production but listens on a **different port** (e.g. 3002).

- **Branch:** `AyaDev`. New features are developed here and merged to `main` when stable.
- **Deploy:** Use the same app directory (or a second clone). Set `DEPLOY_BRANCH=AyaDev` and a different `PORT` for the dev app.

### Run AyaDev locally

```bash
# From the app directory, on branch AyaDev
git checkout AyaDev
git pull origin AyaDev
PORT=3002 npm run dev
```

App will be at `http://localhost:3002` (production remains on 3001 or your usual port).

### Deploy both apps (production + dev) on the same server, same DB

Use **two separate app directories**: one for production (from `main`), one for dev (from `AyaDev`). Both point to the **same database** via `DATABASE_URL`.

#### Prerequisites

- Production app already deployed and running (e.g. `~/aya-eye` or `~/apps/aya-eye`, port 3001, PM2 name `aya-eye`).
- Same server (same machine).

#### Step 1: Create the dev app directory

From a directory where you keep apps (e.g. your home or `~/apps`):

```bash
git clone https://github.com/in8qr/Aya.git aya-eye-dev
cd aya-eye-dev
git checkout AyaDev
```

Use a different folder name than production (e.g. `aya-eye-dev` vs `aya-eye`) so the two installs don’t overwrite each other.

#### Step 2: Use the same .env for dev (same DB, different port)

Copy the production `.env` into the dev directory so both use the same database:

```bash
cp /path/to/aya-eye/.env .env
```

Edit the dev `.env` and set:

- **PORT=3002** (so the dev app listens on 3002 instead of 3001).
- Keep **DATABASE_URL** exactly the same as production (same DB).
- Keep **NEXTAUTH_URL** and **NEXT_PUBLIC_APP_URL** for the **production** site (e.g. `https://yourdomain.com`). For testing the dev app you’ll use `http://server-ip:3002` or a dev subdomain; no need to change these unless you want dev-specific auth URLs.

Save and close.

#### Step 3: Deploy the dev app (install, schema, build)

From the **dev** directory:

```bash
cd ~/aya-eye-dev   # or your dev path
chmod +x scripts/deploy.sh
DEPLOY_BRANCH=AyaDev ./scripts/deploy.sh
```

This pulls `AyaDev`, runs `npm ci`, `prisma generate`, `prisma db push`, `npm run build`. The schema is shared, so `db push` is safe (it only adds new columns/tables if any).

#### Step 4: Start the dev app with PM2

Use the dev PM2 config (port 3002, name `aya-eye-dev`):

```bash
cd ~/aya-eye-dev
pm2 start ecosystem.dev.config.js
pm2 save
```

Check both:

```bash
pm2 status
```

You should see `aya-eye` (port 3001) and `aya-eye-dev` (port 3002).

#### Step 5: Expose the dev app (optional)

- **Same machine, direct access:** Open `http://YOUR_SERVER_IP:3002` in the browser.
- **Via Nginx:** Add a server block that proxies to `127.0.0.1:3002` (e.g. `dev.yourdomain.com`).

---

### Redeploy the dev app later

After code changes on `AyaDev`:

```bash
cd ~/aya-eye-dev
DEPLOY_BRANCH=AyaDev ./scripts/deploy.sh
pm2 restart aya-eye-dev
```

### Summary

| App        | Directory     | Branch  | Port | PM2 name      | DB        |
|-----------|---------------|---------|------|---------------|-----------|
| Production| e.g. `aya-eye`| `main`  | 3001 | `aya-eye`     | shared    |
| Dev       | e.g. `aya-eye-dev` | `AyaDev` | 3002 | `aya-eye-dev` | same DB   |

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

## 3. Development instance (AyaDev)

The **AyaDev** branch runs a second instance on the same machine for trying new features. It uses the **same database** as production and a **different port** (default **3002**).

### 3.1 Local development (two instances)

- **Production (main):** `npm run dev` → port 3000 (or `PORT=3001 npm run dev`).
- **Development (AyaDev):** `PORT=3002 npm run dev` in a second terminal.

Use the same `.env` (same `DATABASE_URL`) so both use the same DB.

### 3.2 Deploying the dev app on the server (same machine, different port)

1. Clone the repo a second time (or use a second directory), e.g. `~/apps/aya-eye-dev`.
2. In that directory, create `.env` with the **same** `DATABASE_URL` as production (and same mail/S3 if you want). Set `PORT=3002` in the PM2 config for this app.
3. Use a second PM2 config (e.g. `ecosystem.dev.config.js`) that:
   - Sets `PORT: 3002`
   - App name: `aya-eye-dev`
4. Deploy from the **AyaDev** branch:

   ```bash
   cd ~/apps/aya-eye-dev
   DEPLOY_BRANCH=AyaDev ./scripts/deploy.sh
   ```

5. Start the dev app with PM2 using the dev config: `pm2 start ecosystem.dev.config.js`.
6. Point a second hostname or path (e.g. `dev.yourdomain.com`) to port 3002 in Nginx, or access via `http://server:3002`.

Schema changes (e.g. `npx prisma db push`) are applied once; both main and AyaDev share the same DB, so run migrations in one place only.

---

## 4. Useful PM2 commands

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

## 5. After schema changes (new tables/columns)

If you added or changed Prisma models (e.g. after merging a feature):

```bash
cd ~/apps/aya-eye/aya-eye
source .env
npx prisma generate
npx prisma db push
pm2 restart aya-eye
```

Use `npx prisma migrate deploy` instead of `db push` if you use migrations.

### P3005: "The database schema is not empty" when running `prisma migrate deploy`

**Cause:** The database was created with `npx prisma db push` (or tables were created some other way), so there is no Prisma migration history. `migrate deploy` expects either an empty database or one that was built from migrations.

**Fix (recommended):** Keep using **`npx prisma db push`** to apply schema changes. From the app directory run:

```bash
npx prisma db push
```

This adds any new columns (e.g. `nameAr`, `descriptionAr`, `deliverablesAr` on `Package`) without needing migration history. Your deploy script and docs already use `db push` for this.

**Alternative (if you want to use migrations from now on):** Run the migration SQL yourself, then mark it as applied so Prisma doesn’t run it again:

```bash
# Connect to your DB (replace with your connection details)
psql "$DATABASE_URL" -c "
  ALTER TABLE \"Package\" ADD COLUMN IF NOT EXISTS \"nameAr\" TEXT;
  ALTER TABLE \"Package\" ADD COLUMN IF NOT EXISTS \"descriptionAr\" TEXT;
  ALTER TABLE \"Package\" ADD COLUMN IF NOT EXISTS \"deliverablesAr\" TEXT;
"
npx prisma migrate resolve --applied 20250217000000_add_package_ar_fields
```

---

## 6. Nginx and HTTPS (optional)

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

## 7. First login

- Open the app in the browser (e.g. `https://yourdomain.com`).
- Log in with **ITAdmin:** `itadmin@ayaphotography.com` / `ITAdmin123!`
- Go to **Admin → Team** and add the main admin and team accounts. Then use **Admin → Appearance** for hero image and moving photos.

---

## 8. Logs

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

### Too many nested `aya-eye` folders (e.g. `apps/aya-eye/aya-eye/aya-eye/`)

If your tree looks like `/home/ms/apps/aya-eye/` → inside it another `aya-eye/` → inside that another `aya-eye/`, you have duplicate copies. The build can compile the wrong (stale) copy and fail with type errors even after `git pull`.

**Fix: keep a single app root and remove the nested duplicate(s).**

1. **Pick one app root** — e.g. `/home/ms/apps/aya-eye/` (one level) **or** `/home/ms/apps/aya-eye/aya-eye/` (two levels). The root must contain `.git`, `package.json`, `src/`, and `next.config.ts` directly (no extra `aya-eye` folder inside it).

2. **If your app root is `/home/ms/apps/aya-eye/`** (one level) and you have a nested `aya-eye` inside it that you do **not** use, remove it:
   ```bash
   cd /home/ms/apps/aya-eye
   rm -rf aya-eye
   ```
   Then use `/home/ms/apps/aya-eye` as the app root for `git pull`, `npm run build`, and `pm2`.

3. **If you want two levels** (`/home/ms/apps/aya-eye/aya-eye/` as the app root): remove only the **innermost** nested folder so there is no `aya-eye/aya-eye/aya-eye/`:
   ```bash
   cd /home/ms/apps/aya-eye/aya-eye
   rm -rf aya-eye
   ```
   Then use this directory as the app root for all commands (`git pull`, `npm run build`, `pm2`).

4. **After cleanup:** From your chosen app root run `git pull origin main`, `rm -rf .next`, `npm run build`, `pm2 restart aya-eye`. There should be only one `src/` under that root.

### Build error path shows `./aya-eye/aya-eye/src/...` or build uses old code

**Root cause:** Next.js is compiling a **different copy** of the app (e.g. a nested `aya-eye/aya-eye` folder). That copy may be stale, so you see type errors that are already fixed in the tree you run `git pull` in. Often caused by **too many nested `aya-eye` folders** (see above).

**Fix:**

1. **Remove duplicate nested folders** so you have a single app root (see “Too many nested `aya-eye` folders” above).
2. **Run both `git pull` and `npm run build` from that app root** — the directory that contains `package.json`, `src/`, and `next.config.ts`.
3. From the app root: `git pull origin main`, then `rm -rf .next && npm run build && pm2 restart aya-eye`.

### `EACCES: permission denied` when running `npm install -g pm2`

- Installing globally requires write access to Node’s global directory.
- **Fix:** Use `sudo npm install -g pm2`, or install PM2 only for your user: `npm install -g pm2` from a directory where you have write access (e.g. after configuring npm’s global prefix to your home), or run PM2 via npx: `npx pm2 start ecosystem.config.js`.
