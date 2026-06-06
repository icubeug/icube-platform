# iCube Platform

A full-stack ISP and WiFi hotspot management platform built for Uganda and East Africa. iCube lets internet service providers manage hotspot sites, MikroTik routers, voucher sales, PPPoE subscribers, field agents, and mobile money billing — all from a single multi-tenant dashboard.

**Production:** [https://web.icubeug.net](https://web.icubeug.net)

---

## What iCube Does

| Capability | Description |
|---|---|
| **Multi-tenant SaaS** | Each ISP business gets its own subdomain (`{slug}.icubeug.net`), branding, and data isolation |
| **Hotspot vouchers** | Generate, sell, and manage time-limited WiFi access codes authenticated via FreeRADIUS |
| **PPPoE billing** | Manage home broadband subscribers with automatic MTN/Airtel mobile money collection |
| **Zero-Touch Provisioning** | MikroTik routers self-configure by running a single script — no manual setup |
| **WireGuard VPN** | All routers maintain a persistent encrypted tunnel back to the platform for monitoring and remote SSH |
| **Agent POS** | Field agents sell vouchers via a mobile-optimised POS, earn commission, and manage float accounts |
| **Captive portal** | Branded login page served to hotspot customers before internet access is granted |
| **AI assistant** | Claude-powered chat assistant with live business data injected per tenant |
| **Analytics** | Real-time RADIUS session data — data usage, top users, session history, termination reasons |
| **Superadmin panel** | iCube staff manage all tenants, router requests, revenue, and platform settings |

---

## Tech Stack

### Backend (`isp-upgrade/`)
- **Runtime:** Node.js 20, Express 4
- **Database:** PostgreSQL 16 (application data + FreeRADIUS tables in one DB)
- **Cache / OTP store:** Redis 7
- **Auth:** JWT (bcrypt passwords, 6-digit OTP via email + SMS)
- **RADIUS:** FreeRADIUS reading `radcheck`/`radreply` from PostgreSQL
- **VPN:** WireGuard (one port per router, `10.99.0.0/24` subnet)
- **Router integration:** MikroTik RouterOS API, UniFi, Omada, Ruijie adapters
- **Payments:** MTN Mobile Money, Airtel Money, Stripe
- **SMS:** Africa's Talking
- **Email:** Nodemailer + Zoho SMTP
- **AI:** Anthropic Claude SDK
- **Real-time:** WebSocket (SSH terminal to routers)
- **Containers:** Docker + Docker Compose (API, PostgreSQL, Redis, FreeRADIUS, WireGuard, Nginx)

### Frontend (`isp-frontend/`)
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **PDF:** jsPDF (voucher printing)

### AI Service (`isp-ai-service/`)
- Standalone Node.js service for AI assistant features (Claude SDK)

---

## Repository Structure

```
isp-platform/                  ← monorepo root (this repo)
├── isp-upgrade/               ← Backend API (Node.js / Express)
│   ├── src/
│   │   ├── app.js             ← Entry point — wires all routes, cron jobs, WebSocket
│   │   ├── auth/              ← Login, OTP, JWT, password reset
│   │   ├── multitenant/       ← Tenant resolution middleware + CRUD
│   │   ├── multirouter/       ← Router adapter factory (MikroTik, UniFi, Omada, Ruijie)
│   │   ├── ztp/               ← Zero-Touch Provisioning script delivery + registration
│   │   ├── vpn/               ← WireGuard service, heartbeat handling, script generation
│   │   ├── vouchers/          ← Voucher generation, RADIUS sync, expiry sweep
│   │   ├── pppoe/             ← PPPoE subscriber management + auto-billing
│   │   ├── agent/             ← POS system, agent auth, wallet, commissions
│   │   ├── portal/            ← Captive portal API (public, no auth)
│   │   ├── payments/          ← Payment records, MTN/Airtel/Stripe integration
│   │   ├── analytics/         ← RADIUS usage analytics
│   │   ├── ai/                ← Claude AI chat with live tenant context
│   │   ├── sites/             ← Hotspot site management
│   │   ├── packages/          ← Internet package (plan) management
│   │   ├── float/             ← Agent float account management
│   │   ├── disbursements/     ← Mobile money payout records
│   │   ├── billing/           ← Platform subscription invoices
│   │   ├── superadmin/        ← iCube staff panel
│   │   ├── notifications/     ← Email + SMS services
│   │   ├── remote/            ← WebSocket SSH terminal
│   │   ├── routers/           ← Router intelligence (tier detection)
│   │   ├── router-requests/   ← Tenant router setup requests
│   │   ├── users/             ← Staff + customer management
│   │   ├── settings/          ← Tenant hotspot/SMS/gateway settings
│   │   ├── support/           ← Support intelligence dashboard
│   │   ├── sales/             ← Sales history
│   │   ├── transactions/      ← Platform transaction ledger
│   │   ├── features/          ← Feature flags + plan limits
│   │   └── schema/            ← PostgreSQL migrations (run in numbered order)
│   ├── config/
│   │   ├── freeradius/        ← FreeRADIUS configuration
│   │   ├── nginx/             ← Nginx reverse proxy config
│   │   └── wireguard/         ← WireGuard peer configs (gitignored)
│   ├── docker-compose.yml     ← Full stack: API + PG + Redis + RADIUS + WireGuard + Nginx
│   ├── Dockerfile
│   ├── .env.example           ← Copy to .env and fill before running
│   └── CLAUDE.md              ← Full developer reference (API docs, schema, business logic)
│
├── isp-frontend/              ← Next.js 14 frontend
│   ├── app/
│   │   ├── admin/             ← ISP admin dashboard (protected)
│   │   ├── agent/             ← Agent POS (protected)
│   │   ├── auth/              ← Login, register, OTP verify, password reset
│   │   ├── portal/[slug]/     ← Captive portal (public, per-tenant branded)
│   │   └── superadmin/        ← iCube superadmin panel
│   ├── components/
│   │   ├── admin/             ← Dashboard charts and widgets
│   │   └── marketing/         ← Landing page components
│   ├── lib/api.ts             ← Typed API client (all backend calls go through here)
│   ├── middleware.ts           ← Next.js auth guard for /admin and /agent routes
│   ├── next.config.mjs        ← Rewrites /api/* → backend :3000
│   └── CLAUDE.md              ← Full developer reference (same as backend)
│
├── isp-ai-service/            ← Standalone AI assistant service
├── deploy.sh                  ← rsync to server + Docker rebuild + PM2 restart
├── start.sh                   ← Start backend + frontend locally in one command
├── .gitignore
└── README.md                  ← You are here
```

---

## Quick Start (Local Development)

### 1. Install prerequisites (macOS)

```bash
brew install node@20 postgresql@16 redis wireguard-tools
brew services start postgresql@16
brew services start redis
```

### 2. Clone and set up backend

```bash
git clone https://github.com/icubeug/icube-platform.git
cd icube-platform/isp-upgrade

npm install
cp .env.example .env
# Edit .env — minimum required:
#   DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/isp_db
#   JWT_SECRET=any-long-random-string
#   AGENT_JWT_SECRET=any-long-random-string
#   SUPERADMIN_JWT_SECRET=any-long-random-string

# Create database and apply all migrations in order
createdb isp_db
for f in src/schema/base_schema.sql src/schema/002_new_tables.sql src/schema/003_icube_platform.sql \
          src/schema/004_radius_wireguard.sql src/schema/005_free_plan.sql src/schema/006_tenants_full_columns.sql \
          src/schema/007_vpn_ports_site_limits.sql src/schema/008_router_monitoring.sql \
          src/schema/009_bearer_tokens.sql src/schema/010_router_requests.sql \
          src/schema/011_totp_deletion.sql src/schema/012_ai_conversations.sql \
          src/schema/013_portal_template.sql; do
  psql isp_db -f $f
done

npm run dev   # → http://localhost:3000
```

### 3. Set up frontend

```bash
cd ../isp-frontend
npm install
npm run dev   # → http://localhost:3001
```

### 4. Or start everything at once

```bash
cd icube-platform
bash start.sh
```

| Service | URL |
|---|---|
| Admin dashboard | http://localhost:3001/admin |
| Agent POS | http://localhost:3001/agent |
| Captive portal | http://localhost:3001/portal |
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |

### 5. Log in (dev shortcut — no email needed)

```bash
# 1. Register a tenant
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test ISP","email":"test@example.com","password":"password123"}'

# 2. Get the OTP without email
curl "http://localhost:3000/api/auth/dev-otp?email=test@example.com"

# 3. Verify to get your JWT
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"<from step 2>"}'
```

**Default superadmin:** `admin@icube.co.ug` / `icube-admin-2026` at `/superadmin/login`

---

## Environment Variables

Copy `isp-upgrade/.env.example` to `isp-upgrade/.env`. Key variables:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs admin JWTs |
| `AGENT_JWT_SECRET` | Yes | Signs agent JWTs |
| `SUPERADMIN_JWT_SECRET` | Yes | Signs superadmin JWTs |
| `ANTHROPIC_API_KEY` | No | Claude AI assistant |
| `MTN_API_KEY` / `MTN_API_SECRET` | No | MTN Mobile Money (Uganda) |
| `AIRTEL_CLIENT_ID` / `AIRTEL_CLIENT_SECRET` | No | Airtel Money (Uganda) |
| `SMS_API_KEY` / `SMS_USERNAME` | No | Africa's Talking SMS (skipped silently if unset) |
| `STRIPE_SECRET_KEY` | No | Card payments |
| `WG_SERVER_PUBLIC_KEY` | No | WireGuard server public key (embedded in router scripts) |
| `PLATFORM_DOMAIN` | No | Base domain. Default: `icubeug.net` |

See [`isp-upgrade/CLAUDE.md`](isp-upgrade/CLAUDE.md) for the complete variable reference.

---

## Deployment

### One-command deploy (rsync + Docker + PM2)

```bash
bash deploy.sh
```

This script:
1. `rsync`s backend and frontend source to `root@139.84.247.205:/opt/icube/` (excluding `node_modules`, `.next`, `.env`)
2. Rebuilds the backend Docker stack on the server (`docker compose up -d --build`)
3. Rebuilds the frontend on the server (`npm install && npm run build`) and restarts PM2

> **Important:** Never run `npm run build` or `next build` manually on the server outside this script — it can OOM the process.

### Manual deploy steps

```bash
# Backend — no build step needed, just restart
ssh root@139.84.247.205 "cd /opt/icube/isp-upgrade && docker compose up -d"

# Frontend — build LOCALLY, then sync
cd isp-frontend && npm run build
rsync -avz .next/ root@139.84.247.205:/opt/icube/isp-frontend/.next/
ssh root@139.84.247.205 "pm2 restart icube-frontend"

# Apply a new database migration
ssh root@139.84.247.205 "psql \$DATABASE_URL -f /opt/icube/isp-upgrade/src/schema/<migration>.sql"
```

### Infrastructure (production)

| Service | How it runs |
|---|---|
| API (port 3000) | Docker Compose (`docker-compose.yml`) |
| PostgreSQL 16 | Docker Compose |
| Redis 7 | Docker Compose |
| FreeRADIUS | Docker Compose (UDP 1812/1813) |
| WireGuard VPN | Docker Compose (UDP 51820+) |
| Nginx | Docker Compose (80/443, TLS via Let's Encrypt) |
| Next.js frontend (port 3001) | PM2 on host |

---

## Key Architectural Concepts

- **Tenant resolution:** Every request to `/api/v1/*` is matched to a tenant via subdomain, custom domain, or `X-Tenant-ID` header. Tenant data is Redis-cached for 5 minutes.
- **RADIUS authentication:** Voucher codes and PPPoE passwords are written directly to `radcheck`/`radreply` PostgreSQL tables, which FreeRADIUS reads. No separate RADIUS config needed per customer.
- **Zero-Touch Provisioning:** Routers run a single `.rsc` script that configures WireGuard VPN, RADIUS, DHCP, hotspot, and registers itself with the platform. After that, heartbeats are sent every 5 minutes.
- **Router VPN:** Each router gets a unique WireGuard peer IP in `10.99.0.0/24` and a unique port starting at 51820. The platform marks routers offline after 5 minutes of missed heartbeats.
- **Agent float:** Admins pre-load float credit onto agents. Agents sell vouchers against their float and receive commission credited to their wallet.

---

## Developer Reference

For complete documentation including full API endpoint reference, database schema, business logic, all environment variables, and known rules:

- **[`isp-upgrade/CLAUDE.md`](isp-upgrade/CLAUDE.md)** — backend developer guide
- **[`isp-frontend/CLAUDE.md`](isp-frontend/CLAUDE.md)** — frontend developer guide (same content)

---

## Project Rules

1. **Never build on the production server** — build the frontend locally and rsync the `.next/` output.
2. **Never delete files without explicit confirmation** — even seemingly unused files may be referenced by field-deployed router scripts.
3. **Always use `web.icubeug.net`** (not a raw IP) in MikroTik scripts and RADIUS configs — routers in the field can't be updated if the IP changes.
4. **Never commit `.env`** — use `.env.example` as the template.

---

## License

Proprietary — © iCube Solutions Ltd. All rights reserved.
