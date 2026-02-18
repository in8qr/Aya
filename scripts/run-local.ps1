# Run Aya Eye locally (Windows)
# 1. Start Docker Desktop, then run this script.

Write-Host "Starting Docker (Postgres + MinIO)..." -ForegroundColor Cyan
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker failed. Is Docker Desktop running?" -ForegroundColor Red
    Write-Host "Install from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

Write-Host "Waiting for Postgres to be ready (10s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

Write-Host "Applying database schema..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "DB push failed. Wait a bit and run: npx prisma db push" -ForegroundColor Red
    exit 1
}

Write-Host "Seeding database..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Starting Next.js dev server..." -ForegroundColor Green
npm run dev
