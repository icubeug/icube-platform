#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SSH_TARGET="${ICUBE_SSH_TARGET:-root@139.84.247.205}"
SSH_KEY="${ICUBE_SSH_KEY:-$HOME/.ssh/icube_server}"
REMOTE_DIR="${ICUBE_REMOTE_DIR:-/opt/icube}"
API_HOST="${ICUBE_API_HOST:-web.icubeug.net}"

SSH_OPTS=()
if [[ -f "$SSH_KEY" ]]; then
  SSH_OPTS=(-i "$SSH_KEY")
fi

echo "==> Preflight: checking SSH access to ${SSH_TARGET}"
ssh "${SSH_OPTS[@]}" -o BatchMode=yes -o ConnectTimeout=10 "$SSH_TARGET" "hostname >/dev/null"

echo "==> Installing and building frontend locally"
cd "$ROOT_DIR/isp-frontend"
npm install
npm run build

echo "==> Installing backend dependencies locally"
cd "$ROOT_DIR/isp-upgrade"
npm install

echo "==> Uploading backend source"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='logs' \
  "$ROOT_DIR/isp-upgrade/" "$SSH_TARGET:$REMOTE_DIR/isp-upgrade/"

echo "==> Uploading frontend source and local build output"
rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude='node_modules' \
  --exclude='.env' \
  "$ROOT_DIR/isp-frontend/" "$SSH_TARGET:$REMOTE_DIR/isp-frontend/"

echo "==> Applying server runtime configuration checks"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "
  set -e
  test -f '$REMOTE_DIR/isp-upgrade/.env' || { echo 'Missing $REMOTE_DIR/isp-upgrade/.env'; exit 2; }
  grep -q '^API_PUBLIC_HOST=' '$REMOTE_DIR/isp-upgrade/.env' || echo 'API_PUBLIC_HOST=$API_HOST' >> '$REMOTE_DIR/isp-upgrade/.env'
  grep -q '^SMS_PROVIDER=' '$REMOTE_DIR/isp-upgrade/.env' || echo 'SMS_PROVIDER=disabled' >> '$REMOTE_DIR/isp-upgrade/.env'
"

echo "==> Rebuilding backend containers and applying migrations"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "
  set -e
  cd '$REMOTE_DIR/isp-upgrade'
  docker compose up -d --build
  docker compose exec -T api npm run migrate
"

echo "==> Installing frontend runtime dependencies and restarting PM2"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "
  set -e
  cd '$REMOTE_DIR/isp-frontend'
  npm install --omit=dev
  pm2 restart icube-frontend
"

echo "==> Health check"
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" "
  set -e
  curl -fsS https://$API_HOST/health
"

echo "Done. System: https://web.icubeug.net"
echo "Marketing: https://www.icubeug.net"
