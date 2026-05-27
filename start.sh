#!/usr/bin/env bash
# start.sh — starts both ISP backend (3000) and frontend (3001)

set -e

eval "$(/opt/homebrew/bin/brew shellenv)" 2>/dev/null || true

# Start PostgreSQL + Redis if not running
brew services start postgresql@16 2>/dev/null || true
brew services start redis 2>/dev/null || true
sleep 1

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ── Backend ──────────────────────────────────────────────────────────────────
echo "▶ Starting backend (port 3000)…"
cd "$ROOT/isp-upgrade"
node -e "require('dotenv').config(); require('./src/app.js')" &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "▶ Starting frontend (port 3001)…"
cd "$ROOT/isp-frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "┌────────────────────────────────────────────────────┐"
echo "│  ISP Platform is running                           │"
echo "│                                                    │"
echo "│  Admin Dashboard  → http://localhost:3001/admin    │"
echo "│  Agent POS        → http://localhost:3001/agent    │"
echo "│  Customer Portal  → http://localhost:3001/portal   │"
echo "│  Backend API      → http://localhost:3000          │"
echo "└────────────────────────────────────────────────────┘"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT INT TERM
wait
