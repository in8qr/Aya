# Contributing to Aya Eye

Thanks for your interest in contributing. This doc keeps the project consistent and maintainable.

## Standards

- **Code style:** TypeScript and React. Use the project's ESLint config (`npm run lint`).
- **Commits:** Prefer clear, present-tense messages (e.g. "Add booking filters", "Fix calendar timezone").
- **Env:** Never commit `.env`. Use `.env.example` as the single source of required variables and document any new ones there.
- **DB:** Use Prisma migrations for schema changes (`npm run db:migrate`). Don't commit `migration_lock.toml` (see `.gitignore`).

## Setup

1. Clone the repo and `npm install`.
2. Copy `.env.example` to `.env` and configure (see README).
3. Start Postgres and MinIO (e.g. `docker compose up -d`), then `npm run db:push` and `npm run db:seed`.
4. Run the app with `npm run dev`.

## Folder structure

- `src/app` — Next.js App Router (API routes under `api/`, pages under `[locale]/`).
- `src/components` — Reusable UI and feature components.
- `src/lib` — Shared utilities, Prisma client, auth, S3, etc.
- `src/hooks` — Custom React hooks.
- `src/i18n` — Next-intl config and messages.
- `prisma` — Schema, migrations, seed.
- `scripts` — Deploy and maintenance scripts.
- `messages` — Locale JSON for next-intl.

Keep new code in the appropriate folder; avoid one-off files in the project root.

## Before submitting

- Run `npm run lint` and fix any issues.
- Run `npm run build` to ensure the app builds.
- If you change env vars or dependencies, update README and/or `.env.example`.
