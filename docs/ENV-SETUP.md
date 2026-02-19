# Step-by-step: Setting environment variables

Use this guide to fill in your `.env` file. Start by copying the example:

```bash
cp .env.example .env
```

Then set each group below. Values in quotes go in `.env` as-is (replace placeholders with your real values).

---

## 1. DATABASE_URL (PostgreSQL)

**What it is:** The connection string your app uses to talk to PostgreSQL.

**Step 1 – Create a database and user (on the server or locally):**

```bash
# As postgres superuser (Linux: sudo -u postgres psql, or use a DB admin)
CREATE USER your_db_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE aya_eye OWNER your_db_user;
```

**Step 2 – Build the URL:**

Format:

```
postgresql://your_db_user:PASSWORD@HOST:5432/DATABASE
```

- **USER** = the user you created (e.g. `your_db_user`)
- **PASSWORD** = the password you set (if it contains `@`, `#`, `:`, or `%`, [URL-encode](https://en.wikipedia.org/wiki/Percent-encoding) it)
- **HOST** = `localhost` if Postgres is on the same machine, or the server IP/hostname
- **DATABASE** = the database name (e.g. `aya_eye`)

**Example (local):**

```env
DATABASE_URL="postgresql://your_db_user:your_secure_password@localhost:5432/aya_eye"
```

**Example (Docker Postgres on same machine):**

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aya_photography"
```

Put this line in `.env` and save.

---

## 2. NEXTAUTH_URL

**What it is:** The full URL where your app is reachable (used for auth callbacks and cookies).

**Rules:**

- **Local:** use `http://localhost:3000` (or the port you run the app on).
- **Production:** use your public URL with `https://` if you use SSL.

**Examples:**

```env
# Local
NEXTAUTH_URL="http://localhost:3000"

# Production (replace with your domain or server IP)
NEXTAUTH_URL="https://yourdomain.com"
# or
NEXTAUTH_URL="http://YOUR_SERVER_IP:3000"
```

Set this in `.env`.

---

## 3. NEXTAUTH_SECRET

**What it is:** A secret key used to sign cookies and tokens. Must be long and random.

**Step 1 – Generate a random string (run in terminal):**

**Linux / macOS / WSL:**

```bash
openssl rand -base64 32
```

**PowerShell (Windows):**

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

**Step 2 – Copy the output and set in `.env`:**

```env
NEXTAUTH_SECRET="paste_the_generated_string_here"
```

Use a different value per environment (e.g. different for local vs production).

---

## 4. SMTP (Gmail) – OTP and team emails

**What it is:** One Gmail (or other SMTP) account is used to send:

- Verification OTP to new customers
- Team notifications (assignment, confirmation, rejection emails)

**Step 1 – Use a Gmail account**

- Use the Gmail address you want to send from (e.g. `aya.photography@gmail.com`).
- You will use an **App Password**, not your normal Gmail password.

**Step 2 – Turn on 2-Step Verification**

1. Go to [Google Account](https://myaccount.google.com/) → **Security**.
2. Under “How you sign in to Google”, enable **2-Step Verification** and complete the steps.

**Step 3 – Create an App Password**

1. In **Security** → **2-Step Verification**, click **App passwords** (or go to [App passwords](https://myaccount.google.com/apppasswords)).
2. Select app: **Mail**, device: **Other** (e.g. “Aya Eye”).
3. Click **Generate**.
4. Copy the **16-character password** (no spaces). This is your `SMTP_PASSWORD`.

**Step 4 – Set these in `.env`:**

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your@gmail.com"
SMTP_PASSWORD="your-16-char-app-password"
EMAIL_FROM="Aya Eye <your@gmail.com>"
```

- **SMTP_USER:** The full Gmail address (e.g. `aya.photography@gmail.com`).
- **SMTP_PASSWORD:** The 16-character App Password from Step 3.
- **EMAIL_FROM:** The “From” name and address recipients see. Use the same Gmail in the angle brackets.

**If you use another SMTP provider:** change `SMTP_HOST`, `SMTP_PORT`, and optionally `SMTP_SECURE` (e.g. `true` for port 465). Keep `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` in the same format.

---

## 5. S3 (optional – MinIO or AWS S3)

**What it is:** Object storage for portfolio images (public) and receipt attachments (private). Only needed if you use uploads.

**Option A – MinIO (e.g. on same server or Docker)**

1. Install/run MinIO and create two buckets: `aya-portfolio` (public) and `aya-receipts` (private).
2. Get the MinIO access key and secret (default in Docker is often `minioadmin` / `minioadmin`).
3. In `.env`:

```env
S3_ENDPOINT="http://localhost:9000"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadmin"
S3_PORTFOLIO_BUCKET="aya-portfolio"
S3_RECEIPTS_BUCKET="aya-receipts"
S3_FORCE_PATH_STYLE="true"
```

- If MinIO is on another machine, set `S3_ENDPOINT` to `http://THAT_IP:9000`.

**Option B – AWS S3**

1. Create an IAM user with programmatic access and a policy that allows `s3:PutObject`, `s3:GetObject`, etc. on your buckets.
2. Create two buckets (e.g. `aya-portfolio`, `aya-receipts`) and set permissions.
3. In `.env`:

```env
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_ACCESS_KEY_ID="AKIA..."
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_PORTFOLIO_BUCKET="aya-portfolio"
S3_RECEIPTS_BUCKET="aya-receipts"
S3_FORCE_PATH_STYLE="false"
```

(You can leave `S3_ENDPOINT` unset for AWS and the SDK will use the default; the app may still read it.)

**If you don’t use uploads:** you can leave S3 vars unset or commented out; the app may show errors only when someone tries to upload.

---

## 6. NEXT_PUBLIC_APP_URL

**What it is:** The public URL of your app (used for links in emails and sometimes redirects). Should match how users open the site.

**Rules:**

- **Local:** `http://localhost:3000` (or your dev port).
- **Production:** Same as `NEXTAUTH_URL` (e.g. `https://yourdomain.com` or `http://YOUR_SERVER_IP:3000`).

**Example:**

```env
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

Set this in `.env` and keep it in sync with `NEXTAUTH_URL` in production.

---

## 7. Optional: RESEND_API_KEY

**What it is:** Only used for booking-related emails (assignment, confirmation, rejection) **if** you do **not** set SMTP. If `SMTP_*` is set, the app uses Gmail/SMTP for all mail and ignores Resend.

**When to set:** Leave unset if you use Gmail/SMTP. Set only if you want to send booking emails via [Resend](https://resend.com) instead of SMTP (OTP still requires SMTP).

**How to get it:**

1. Sign up at [resend.com](https://resend.com).
2. Add and verify your domain (or use their test domain for testing).
3. In the dashboard, create an API key and copy it.

**In `.env`:**

```env
RESEND_API_KEY="re_xxxxxxxxxxxx"
```

---

## Quick checklist

Before running the app, confirm:

- [ ] `DATABASE_URL` – correct user, password, host, database name
- [ ] `NEXTAUTH_URL` – matches how you open the app (http/https, host, port)
- [ ] `NEXTAUTH_SECRET` – long random string (e.g. from `openssl rand -base64 32`)
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` – Gmail (or other SMTP) set as in section 4
- [ ] `NEXT_PUBLIC_APP_URL` – same as `NEXTAUTH_URL` in production
- [ ] S3 vars – set only if you use MinIO or AWS S3 for uploads

Then run:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
npm start
```

---

## Deploy from GitHub (server)

After pushing to `main`, on the server (replace `~/apps/aya-eye/aya-eye` with your app directory if different):

**Option A – use the deploy script (recommended):**

```bash
cd ~/apps/aya-eye/aya-eye
git fetch origin main
git reset --hard origin/main
./scripts/deploy.sh production
```

The script uses `prisma migrate deploy` only when `prisma/migrations` has files; otherwise it runs `prisma db push` so the DB schema stays in sync.

**Option B – manual steps:**

```bash
cd ~/apps/aya-eye/aya-eye
git fetch origin main
git reset --hard origin/main

npm ci
npx prisma generate

# Schema: use one of these (not both)
# - If you have migration files in prisma/migrations:
npx prisma migrate deploy
# - If you have no migrations (existing DB, schema changes via Prisma):
npx prisma db push --accept-data-loss=false

npm run build
pm2 restart ecosystem.config.js
pm2 save
```

Ensure `.env` on the server has all required variables (see checklist above).
