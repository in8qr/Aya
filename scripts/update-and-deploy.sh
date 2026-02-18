#!/bin/bash
# Update Linux (apt) and redeploy Aya Eye
# Run on the server:
#   sudo ./scripts/update-and-deploy.sh
# Or (if you're already root): ./scripts/update-and-deploy.sh

set -e

APP_DIR="${APP_DIR:-/home/ayaeye/apps/aya-eye}"
DEPLOY_SCRIPT="$APP_DIR/scripts/deploy.sh"
DEPLOY_USER="${DEPLOY_USER:-ayaeye}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# --- 1) System update (needs root) ---
if [ "$(id -u)" -eq 0 ]; then
  log "Updating system packages (apt)..."
  apt-get update -qq && apt-get upgrade -y -qq || warn "apt upgrade had issues"
  log "System update done."

  if [ ! -f "$DEPLOY_SCRIPT" ]; then
    err "Deploy script not found: $DEPLOY_SCRIPT (set APP_DIR if app is elsewhere)"
  fi
  log "Running deploy as user: $DEPLOY_USER"
  su - "$DEPLOY_USER" -c "cd $APP_DIR && ./scripts/deploy.sh"
else
  # Not root: run deploy from current directory
  if [ -f "scripts/deploy.sh" ]; then
    log "Running deploy..."
    ./scripts/deploy.sh
  else
    err "Run from app directory (e.g. cd $APP_DIR) or as root: sudo $0"
  fi
fi
