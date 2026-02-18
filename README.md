# Aya Eye

Full-stack booking and portfolio site for a photography business. Bookings are request-based (no auto-confirm); admin assigns team, confirms or rejects, and can attach receipts.

## Stack

- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui, FullCalendar
- **Backend:** Next.js API routes, Prisma, PostgreSQL
- **Auth:** NextAuth.js (Credentials)
- **Storage:** S3-compatible (MinIO or AWS S3) — public bucket for portfolio, private for receipts
- **Email:** Resend

## Setup

### 1. Environment

```bash
cp .env.example .env
```

Edit `.env`:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — app URL (e.g. `http://localhost:3000` or your domain)
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `RESEND_API_KEY` and `EMAIL_FROM` — for transactional email
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

**Seed accounts:**

- Admin: `aya@ayaphotography.com` / `Admin123!`
- Team: `team@ayaphotography.com` / `Team123!`
- Customer: `customer@example.com` / `Customer123!`

## Production

- **Build:** `npm run build`
- **Run:** `npm start` or use `pm2 start ecosystem.config.js`
- Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your public URL. Put the app behind Nginx or Cloudflare Tunnel for HTTPS.

## Business rules

- New bookings get status `PENDING_REVIEW`; only admin can confirm or reject.
- Only **CONFIRMED** bookings consume capacity.
- Capacity = active team members − unavailable on that day (+ optional daily override).
- Submission is blocked if the day/time is blocked or confirmed count ≥ capacity.
- Assignment email to team member; confirmation/rejection email to customer.
- Receipts are admin-only, stored in private bucket, optional and multiple per booking (each with a name + file).

## Logs

Errors are written to **`logs/app.log`** in the project folder. Ensure PostgreSQL is running and you have run `npx prisma db push` and `npm run db:seed` before signing in or loading Packages/Portfolio.
