# Aya Eye

Full-stack booking and portfolio site for a photography business. Bookings are request-based (no auto-confirm); admin assigns team, confirms or rejects, and can attach receipts.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, FullCalendar
- **Backend:** Next.js API routes, Prisma, PostgreSQL
- **Auth:** NextAuth.js (Credentials)
- **Storage:** S3-compatible (MinIO or AWS S3) — public bucket for portfolio, private for receipts
- **Email:** One sender (SMTP, e.g. Gmail) for OTP verification and team/booking notifications. Optional Resend fallback.

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env`. **Step-by-step guide:** see [docs/ENV-SETUP.md](docs/ENV-SETUP.md).

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — app URL (e.g. `http://localhost:3000` or your domain)
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- **Email (one sender for OTP + team notifications):** Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` (e.g. Gmail + [App Password](https://support.google.com/accounts/answer/185833)). If SMTP is set, all mail (verification OTP, assignment, confirmation, rejection) uses it.
- S3 vars — for MinIO use `S3_ENDPOINT=http://localhost:9000`, `S3_FORCE_PATH_STYLE=true`, create buckets `aya-portfolio` and `aya-receipts`

### 2. Database and MinIO (Docker)

```bash
docker compose up -d
```

Then create MinIO buckets (e.g. in MinIO Console at http://localhost:9001):

- `aya-portfolio` (public for portfolio images)
- `aya-receipts` (private for receipt attachments)

### 3. Install and DB

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

**Bootstrap account (seed):**

- **ITAdmin:** `itadmin@ayaphotography.com` / `ITAdmin123!` — use this to log in and create the Aya admin and team accounts from **Admin → Team**. New customers register and verify email via OTP.

## Production

- **Build:** `npm run build`
- **Run:** `npm start` or use `pm2 start ecosystem.config.js`
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your public URL. Put the app behind Nginx or Cloudflare Tunnel for HTTPS.

### Update Linux and redeploy

On the server (Debian/Ubuntu), to update system packages and redeploy the app:

```bash
# From the app directory (e.g. /home/ayaeye/apps/aya-eye), run as root
# (updates apt, then runs deploy as ayaeye)
chmod +x scripts/*.sh   # if needed
sudo ./scripts/update-and-deploy.sh
```

Or do it in two steps:

```bash
# 1. Update system (as root)
sudo apt-get update && sudo apt-get upgrade -y

# 2. Deploy app (as ayaeye user)
su - ayaeye -c "cd /home/ayaeye/apps/aya-eye && ./scripts/deploy.sh"
```

The deploy script (`scripts/deploy.sh`) pulls latest from `main`, runs `npm ci`, Prisma generate, migrations, build, and restarts PM2. It must be run as the app user.

---

## Linux server setup (from scratch)

Use these steps to set up the app on a fresh Linux server (Debian/Ubuntu).

### 1. Clone and install

```bash
# Create app user and dir (e.g. /home/ms/apps/aya-eye)
sudo useradd -m -s /bin/bash ms   # or your preferred user
sudo su - ms
cd ~
git clone https://github.com/in8qr/Aya.git aya-eye
cd aya-eye
```

Install Node.js 20 (or use [nvm](https://github.com/nvm-sh/nvm)):

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
cd ~/aya-eye   # or ~/apps/aya-eye
npm install
```

### 2. PostgreSQL

Install and create DB:

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres createuser -P ms
sudo -u postgres createdb -O ms aya_eye
```

Use the password you set when creating the user. Connection string:

`postgresql://ms:YOUR_PASSWORD@localhost:5432/aya_eye`

### 3. Environment file

```bash
cp .env.example .env
nano .env   # or vim
```

Set at least:

- `DATABASE_URL="postgresql://ms:YOUR_PASSWORD@localhost:5432/aya_eye"`
- `NEXTAUTH_URL="https://yourdomain.com"` (or `http://YOUR_SERVER_IP:3000` for testing)
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32` and paste
- **Email (one sender for OTP and team emails):**
  - `SMTP_HOST="smtp.gmail.com"`
  - `SMTP_PORT="587"`
  - `SMTP_SECURE="false"`
  - `SMTP_USER="your@gmail.com"`
  - `SMTP_PASSWORD="your-gmail-app-password"`
  - `EMAIL_FROM="Aya Eye <your@gmail.com>"`
- S3 (if you use MinIO on same server or elsewhere): `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PORTFOLIO_BUCKET`, `S3_RECEIPTS_BUCKET`, `S3_FORCE_PATH_STYLE="true"`
- `NEXT_PUBLIC_APP_URL` — same as `NEXTAUTH_URL`

Save and exit.

### 4. Database schema and seed

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

If you already had data and added the `emailVerifiedAt` column, backfill existing users so they can still log in:

```bash
npx prisma db execute --stdin <<< 'UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;'
```

(Or run `npm run db:seed` again; the seed backfills null `emailVerifiedAt`.)

### 5. Build and run

```bash
npm run build
```

**PM2 (recommended):**

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the command it prints so PM2 starts on boot
```

Or run once: `npm start` (port 3000).

### 6. First login

- Open the app in the browser (e.g. `http://YOUR_SERVER_IP:3000` or your domain).
- Log in with **ITAdmin:** `itadmin@ayaphotography.com` / `ITAdmin123!`
- Go to **Admin → Team** and add the Aya admin account and any team members. Those accounts do not require email OTP (only new customer registrations do).
- New customers register on the site and must verify their email with the OTP sent to their inbox.

### 7. Redeploy (after git push)

```bash
cd ~/aya-eye
git fetch origin main
git reset --hard origin/main
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or use your existing deploy script if you have one.

### 8. (Optional) Nginx and HTTPS

Put Nginx in front and use Let’s Encrypt:

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Proxy to `http://127.0.0.1:3000` in your Nginx server block for the app.

---

## Business rules

- New bookings get status `PENDING_REVIEW`; only admin can confirm or reject.
- Only **CONFIRMED** bookings consume capacity.
- Capacity = active team members − unavailable on that day (+ optional daily override).
- Submission is blocked if the day/time is blocked or confirmed count ≥ capacity.
- Assignment email to team member; confirmation/rejection email to customer.
- Receipts are admin-only, stored in private bucket, optional and multiple per booking (each with a name + file).

## Logs

Errors are written to **`logs/app.log`** in the project folder. Ensure PostgreSQL is running and you have run `npx prisma db push` and `npm run db:seed` before signing in or loading Packages/Portfolio.
