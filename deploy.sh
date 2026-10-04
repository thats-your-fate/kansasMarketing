#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-future-wells-ks-web.service}"
PORT="${PORT:-3009}"
HEALTH_URL="${HEALTH_URL:-}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
USER_SYSTEMD_DIR="${USER_SYSTEMD_DIR:-$HOME/.config/systemd/user}"
LOCK_HASH_FILE="${LOCK_HASH_FILE:-node_modules/.deploy-package-lock.sha256}"

log() {
  printf '\n==> %s\n' "$*"
}

install_node_deps() {
  if [ -f package-lock.json ]; then
    local current_hash
    current_hash="$(sha256sum package-lock.json | awk '{print $1}')"
    if [ -d node_modules ] && [ -x node_modules/.bin/tsc ] && [ -f "$LOCK_HASH_FILE" ] && [ "$(cat "$LOCK_HASH_FILE")" = "$current_hash" ]; then
      log "Dependencies unchanged"
      return 0
    fi

    log "Installing dependencies"
    npm ci --include=dev
    printf '%s' "$current_hash" > "$LOCK_HASH_FILE"
  elif [ ! -d node_modules ]; then
    log "Installing dependencies"
    npm install
  else
    log "Dependencies unchanged"
  fi
}

install_user_unit() {
  local unit="$1"
  local source="$APP_DIR/deploy/systemd/user/$unit"
  if [ ! -f "$source" ]; then
    return 0
  fi
  install -d -m 0755 "$USER_SYSTEMD_DIR"
  install -m 0644 "$source" "$USER_SYSTEMD_DIR/$unit"
}

wait_for_http() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 30); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for ${url}" >&2
  return 1
}

cd "$APP_DIR"

log "Pulling latest code"
git pull --ff-only

if [ -r "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
fi

export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-3009}"
export BACKEND_API_URL="${BACKEND_API_URL:-http://127.0.0.1:4008}"
export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://futurewellskansas.com}"
export NEXT_PUBLIC_INDEXING_ENABLED="${NEXT_PUBLIC_INDEXING_ENABLED:-true}"
export NEXT_PUBLIC_ANALYTICS_ENABLED="${NEXT_PUBLIC_ANALYTICS_ENABLED:-false}"
export NEXT_PUBLIC_GOOGLE_ANALYTICS_ID="${NEXT_PUBLIC_GOOGLE_ANALYTICS_ID:-}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/}"

install_node_deps

log "Generating static sitemap"
node scripts/generate-sitemap.mjs

log "Building Kansas marketing site"
node -e 'require("fs").rmSync(".next",{recursive:true,force:true})'
npm run build

log "Installing user systemd unit"
install_user_unit "$SERVICE_NAME"

systemctl --user daemon-reload
systemctl --user enable "$SERVICE_NAME" >/dev/null

log "Restarting ${SERVICE_NAME}"
systemctl --user restart "$SERVICE_NAME"

log "Checking Kansas marketing site health"
wait_for_http "$HEALTH_URL"
systemctl --user status "$SERVICE_NAME" --no-pager
