#!/bin/bash
# Update Linux (apt) and redeploy Aya Eye
# Run on the server from the app directory:
#   sudo ./scripts/update-and-deploy.sh
# When run with sudo: uses the directory containing this script as the app dir
# and runs deploy as the user who ran sudo (e.g. ms). No need for ayaeye user.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# App dir: when run as root, use dir containing this script; else use APP_DIR or cwd
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="${APP_DIR:-$SCRIPT_DIR/..}"
APP_DIR="$(cd "$APP_DIR" && pwd)"

if [ "$(id -u)" -eq 0 ]; then
  log "Updating system packages (apt)..."
  apt-get update -qq && apt-get upgrade -y -qq || warn "apt upgrade had issues"
  log "System update done."

  DEPLOY_USER="${DEPLOY_USER:-$SUDO_USER}"
  if [ -z "$DEPLOY_USER" ]; then
    err "Could not determine user to run deploy as. Set DEPLOY_USER=youruser"
  fi
  if [ ! -f "$APP_DIR/scripts/deploy.sh" ]; then
    err "Deploy script not found at $APP_DIR/scripts/deploy.sh"
  fi
  log "Running deploy as user: $DEPLOY_USER (app dir: $APP_DIR)"
  su - "$DEPLOY_USER" -c "cd $APP_DIR && ./scripts/deploy.sh"
else
  if [ -f "scripts/deploy.sh" ]; then
    log "Running deploy..."
    ./scripts/deploy.sh
  else
    err "Run from app directory (e.g. cd $APP_DIR) or as root: sudo $0"
  fi
fi
