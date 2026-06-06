# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Local Development Setup (New Mac from Scratch)

### Prerequisites

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20, PostgreSQL 16, Redis
brew install node@20 postgresql@16 redis

# Start PostgreSQL and Redis as background services
brew services start postgresql@16
brew services start redis

# Install WireGuard tools (needed for key generation in router.routes.js)
brew install wireguard-tools
```

### Backend setup

```bash
cd isp-upgrade

# Install dependencies
npm install

# Copy and fill environment variables
cp .env.example .env
# Edit .env — minimum required for local dev:
#   DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/isp_db
#   JWT_SECRET=any-random-string-for-dev
#   AGENT_JWT_SECRET=any-random-string-for-dev
#   SUPERADMIN_JWT_SECRET=any-random-string-for-dev

# Create database and run schema
createdb isp_db
# Run ALL schema files in order (each is IF NOT EXISTS safe):
psql isp_db -f src/schema/base_schema.sql
psql isp_db -f src/schema/002_new_tables.sql
psql isp_db -f src/schema/003_icube_platform.sql
psql isp_db -f src/schema/004_radius_wireguard.sql
psql isp_db -f src/schema/005_free_plan.sql
psql isp_db -f src/schema/006_tenants_full_columns.sql
psql isp_db -f src/schema/007_vpn_ports_site_limits.sql
psql isp_db -f src/schema/008_router_monitoring.sql
psql isp_db -f src/schema/009_bearer_tokens.sql
psql isp_db -f src/schema/010_router_requests.sql
psql isp_db -f src/schema/011_totp_deletion.sql
psql isp_db -f src/schema/012_ai_conversations.sql
psql isp_db -f src/schema/013_portal_template.sql

# Start backend (hot-reload)
npm run dev
# API now at http://localhost:3000
```

### Frontend setup

```bash
cd ../isp-frontend
npm install
npm run dev
# Frontend now at http://localhost:3001
```

All `/api/*` calls from the frontend are proxied via `next.config.mjs` rewrites to the backend at port 3000.

### Dev login shortcut (no email/SMS needed)

1. Register a tenant: `POST /api/auth/register`
2. Get the OTP without email: `GET /api/auth/dev-otp?email=your@email.com` (only works when `NODE_ENV !== 'production'`)
3. Verify: `POST /api/auth/verify-otp` with the returned OTP

### Default superadmin credentials

- Email: `admin@icube.co.ug`
- Password: `icube-admin-2026`
- Login at: `/superadmin/login`

---

## Commands

```bash
# Backend
npm run dev        # nodemon hot-reload on :3000
npm start          # production start
npm test           # jest with coverage
npx jest --testPathPattern=auth  # single test file

# Frontend (in isp-frontend/)
npm run dev        # Next.js dev on :3001
npm run build      # production build
npm start          # serve production build on :3001

# Docker (full stack — API + Postgres + Redis + FreeRADIUS + WireGuard + Nginx)
docker-compose up -d
docker-compose logs -f api
docker-compose down

# Database
psql $DATABASE_URL -f src/schema/<migration>.sql  # apply a single migration
```

---

## Known Rules and Constraints

**Never do these:**

1. **Never run `npm run build` or `next build` on the production server.** Builds are run locally and the compiled output is deployed. Building on the server causes downtime and can OOM-kill the process.
2. **Never delete files without explicit permission from the user.** Even unused-looking files may be referenced from production scripts or configs not in this repo.
3. **Always use `web.icubeug.net` (not a raw IP address) in MikroTik scripts, RADIUS configs, and ZTP script output.** The IP can change; the domain must be stable for routers already deployed in the field.
4. **Never commit `.env`** — it contains live credentials. The `.env.example` is the template.
5. **Never modify `radcheck` or `radreply` rows directly** in a migration without updating the application layer too — these are the live RADIUS auth tables read by FreeRADIUS in real time.
6. **Never add raw IP addresses to `platform_settings`** `icube_server_ip` or `icube_portal_domain` — always use domain names so field routers can continue to reach the platform after IP changes.

---

## Architecture

### High-level overview

```
Browser → Next.js (port 3001)
              ↓ rewrites /api/* 
         Express API (port 3000)
              ├── PostgreSQL 16 (data + FreeRADIUS tables)
              ├── Redis (OTP store, tenant cache, AI cache)
              ├── FreeRADIUS (UDP 1812/1813 — reads PG radcheck/radreply)
              └── WireGuard VPN (UDP 51820+ — one port per router)
                       ↑
              MikroTik routers in the field
```

### Multi-tenancy

Every ISP business is a **tenant**. All `/api/v1/*` routes (except `auth`, `superadmin`, `portal`, and ZTP) pass through `src/multitenant/tenant.middleware.js`, which resolves the tenant from:

1. `X-Tenant-ID` header (API clients, Postman testing)
2. Subdomain (e.g. `acme.icubeug.net`)
3. Custom domain (stored in `tenant_branding.custom_domain`)

The middleware sets `req.tenant`, `req.tenant_id`, and the PostgreSQL session variable `app.current_tenant_id` for RLS enforcement. Tenant records are Redis-cached for 5 minutes under keys `tenant:id:<id>`, `tenant:slug:<slug>`, `tenant:domain:<domain>`. A suspended tenant receives 403 on all API calls.

### Auth model

**Tenant admin login** (two-factor):
1. `POST /api/auth/login` — validates bcrypt password, generates 6-digit OTP, stores in Redis with 10-minute TTL, delivers via email (primary) and SMS (best-effort via Africa's Talking).
2. `POST /api/auth/verify-otp` — validates OTP, deletes it (one-time use), issues a 7-day JWT signed with `JWT_SECRET` containing `{ admin_id, tenant_id, role }`.

JWT roles for tenant admins: `admin`, `viewer`. The `superadmin` role is a separate table and JWT secret (`SUPERADMIN_JWT_SECRET`), accessed at `/api/superadmin/*` with no tenant middleware.

Agent login uses phone + PIN (bcrypt), issues a 12-hour JWT signed with `AGENT_JWT_SECRET`.

The frontend stores the JWT as cookie `icube_token`. Next.js middleware (`middleware.ts`) checks this cookie and redirects unauthenticated requests from `/admin/*` and `/agent/*` to `/auth/login`.

### Security and tenant isolation

- All queries in tenant-scoped routes use `req.tenant_id` (set by middleware) as a WHERE clause. There is no RLS policy at the PostgreSQL level — isolation is enforced at the application layer.
- `SET LOCAL app.current_tenant_id` is set per request for any future RLS policies but is not currently enforced by PG itself.
- Superadmin routes bypass tenant middleware entirely and use a separate JWT secret.
- ZTP routes authenticate via `bearer_token` (prefix `icube_`) stored per router — no JWT involved. This allows MikroTik scripts to call the API without admin credentials.
- The portal routes (`/api/portal/*`) are fully public — no auth — because they are loaded by browsers behind hotspot captive portals before internet access is granted.

---

## API Endpoint Reference

All tenant-scoped routes require a valid admin JWT (`Authorization: Bearer <token>`) and resolve the tenant via middleware.

### Auth — `/api/auth/*` (public, no tenant middleware)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create new tenant + admin account. Body: `{ business_name, email, password, owner_name?, phone?, plan?, subdomain? }` |
| POST | `/api/auth/login` | Step 1: validate credentials, send OTP. Body: `{ email, password }` |
| POST | `/api/auth/verify-otp` | Step 2: validate OTP, return JWT. Body: `{ email, otp }` |
| POST | `/api/auth/resend-otp` | Resend OTP (rate-limited: once per minute). Body: `{ email }` |
| POST | `/api/auth/forgot-password` | Send password reset OTP. Body: `{ email }` |
| POST | `/api/auth/reset-password` | Reset password with OTP. Body: `{ email, otp, new_password }` |
| POST | `/api/auth/logout` | No-op (JWT is stateless). |
| GET | `/api/auth/me` | Get current admin from JWT. |
| GET | `/api/auth/dev-otp?email=` | **Dev only** — return live OTP from Redis. |

### Superadmin — `/api/superadmin/*` (separate JWT, no tenant middleware)

| Method | Path | Description |
|---|---|---|
| POST | `/api/superadmin/login` | Login with email+password, get superadmin JWT. |
| GET | `/api/superadmin/me` | Current superadmin profile. |
| GET | `/api/superadmin/dashboard` | Platform-wide stats (all tenants). |
| GET | `/api/superadmin/tenants` | List all tenants with usage metrics. |
| GET | `/api/superadmin/tenants/:id` | Single tenant detail + notes. |
| PATCH | `/api/superadmin/tenants/:id` | Update tenant plan/status/limits. |
| GET | `/api/superadmin/router-requests` | All pending router setup requests. |
| PATCH | `/api/superadmin/router-requests/:id` | Update request status. |

### Zero-Touch Provisioning — `/api/v1/router/*` (bearer-token auth, no tenant middleware)

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/router/:tenant_slug/scripts/full/:install_token` | Download complete MikroTik setup `.rsc` script |
| GET | `/api/v1/router/:tenant_slug/scripts/radius/:install_token` | RADIUS-only setup script |
| GET | `/api/v1/router/:tenant_slug/scripts/vpn/:install_token` | WireGuard VPN-only script |
| POST | `/api/v1/router/:tenant_slug/scripts/captive` | Captive portal template script. Body: `{ variation, theme }`. Bearer auth. |
| POST | `/api/v1/router/register` | Router self-registers after running ZTP script. Body: `{ identity, model, serial, ros_version, wan_ip }`. Bearer auth. |
| POST | `/api/v1/router/heartbeat` | Router heartbeat. Body: `{ cpu_load, memory_used, active_users, wan_ip }`. Bearer or token auth. |

### Portal — `/api/portal/*` (public, no auth)

| Method | Path | Description |
|---|---|---|
| GET | `/api/portal/:slug` | Tenant branding + available packages (for captive portal UI) |
| POST | `/api/portal/:slug/pay` | Initiate mobile money payment from captive portal |
| GET | `/api/portal/:slug/status/:ref` | Poll payment status by reference |
| POST | `/api/portal/:slug/voucher` | Redeem/activate a voucher code |

### Sites — `/api/v1/sites`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/sites` | List sites with router count + active voucher count |
| GET | `/api/v1/sites/limit` | Returns `{ max_sites, count }` for this tenant |
| POST | `/api/v1/sites` | Create site. Body: `{ name, location }`. Enforces `max_sites` limit. |
| GET | `/api/v1/sites/:id` | Single site |
| PATCH | `/api/v1/sites/:id` | Update name/location/status |

### Routers — `/api/v1/routers`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/routers` | List routers with VPN status and metrics |
| POST | `/api/v1/routers/zero-touch` | Create router via ZTP (no IP needed). Body: `{ name, model, site_id?, vpn_type? }`. Returns router record + install script. |
| GET | `/api/v1/routers/:id` | Single router detail |
| GET | `/api/v1/routers/:id/analytics` | CPU/memory/users time-series from heartbeat log |
| PATCH | `/api/v1/routers/:id` | Update router config |
| DELETE | `/api/v1/routers/:id` | Remove router |
| POST | `/api/v1/routers/:id/script` | Regenerate MikroTik setup script |
| POST | `/api/v1/routers/heartbeat` | Legacy heartbeat path (by `vpn_username`) |

### Packages — `/api/v1/packages`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/packages?search=&page=&per_page=` | List packages |
| POST | `/api/v1/packages` | Create package. Body: `{ name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx, data_limit_mb, site_id }` |
| PATCH | `/api/v1/packages/:id` | Update fields (any subset) |
| DELETE | `/api/v1/packages/:id` | Delete package |

### Vouchers — `/api/v1/vouchers`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/vouchers?status=unused&site_id=&limit=&offset=` | List vouchers |
| POST | `/api/v1/vouchers/generate` | Batch generate vouchers. Body: `{ package_id, site_id?, count?, format?, length?, note?, use_case?, prefix?, expires_at? }`. Max 500 per call. |
| GET | `/api/v1/vouchers/:id` | Single voucher |
| PATCH | `/api/v1/vouchers/:id` | Update voucher (status, note, etc.) |
| DELETE | `/api/v1/vouchers/:id` | Soft-delete (sets `deleted_at`) |

### Sales — `/api/v1/sales`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/sales?search=&package_id=&agent_id=&from=&to=&page=` | List all sales (vouchers joined with payments) |
| GET | `/api/v1/sales/trash` | Soft-deleted sales |
| POST | `/api/v1/sales/:id/restore` | Restore a soft-deleted sale |

### Payments — `/api/v1/payments`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/payments?limit=&offset=` | List payments with voucher code + site name |
| GET | `/api/v1/payments/:id` | Single payment |

### Agents — `/api/v1/agents`

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/agents/login` | Agent login with phone + PIN. Returns agent JWT. |
| GET | `/api/v1/agents/dashboard` | Agent stats + wallet + recent transactions (agent JWT required) |
| GET | `/api/v1/agents/packages` | Packages available at agent's site (agent JWT) |
| POST | `/api/v1/agents/sale` | Process POS sale. Body: `{ package_id, customer_phone, payment_method? }` (agent JWT) |
| POST | `/api/v1/agents/withdraw` | Request wallet withdrawal. Body: `{ amount_ugx, payout_phone }` (agent JWT) |
| GET | `/api/v1/agents` | List all agents for tenant (admin JWT) |
| POST | `/api/v1/agents` | Create agent (admin JWT). Body: `{ name, phone, pin, site_id, commission_pct }` |
| PATCH | `/api/v1/agents/:id` | Update agent (admin JWT) |

### PPPoE — `/api/v1/pppoe`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/pppoe/subscribers?status=&search=&package_id=&page=` | List PPPoE subscribers |
| POST | `/api/v1/pppoe/subscribers` | Create subscriber. Body: `{ full_name, username, password, phone, email, plan_id, router_id, site_id }` |
| GET | `/api/v1/pppoe/subscribers/:id` | Single subscriber |
| PATCH | `/api/v1/pppoe/subscribers/:id` | Update subscriber |
| POST | `/api/v1/pppoe/billing/run` | Manually trigger billing cycle (admin) |
| GET | `/api/v1/pppoe/plans` | List PPPoE plans |
| POST | `/api/v1/pppoe/plans` | Create plan |

### Float — `/api/v1/float`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/float?page=` | Agent float accounts with current balance |
| PATCH | `/api/v1/float/:agent_id` | Toggle `use_float` for an agent. Body: `{ use_float }` |
| GET | `/api/v1/float/purchases?page=` | History of admin float top-ups |
| GET | `/api/v1/float/transactions?agent_id=&operation=&page=` | Float transaction ledger |
| POST | `/api/v1/float/purchase` | Admin tops up agent float. Body: `{ agent_id, amount, payer? }` |

### Disbursements — `/api/v1/disbursements`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/disbursements?search=&from=&to=&page=` | List disbursements with total disbursed |
| POST | `/api/v1/disbursements` | Create disbursement record. Body: `{ phone, amount_ugx, payee?, reason? }` |

### Transactions — `/api/v1/transactions`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/transactions?search=&from=&to=&operation=&page=` | Platform-level debit/credit ledger (`platform_transactions` table) |

### Billing — `/api/v1/billing`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/billing/history?from=&to=&status=&page=` | Invoice history with account credit balance |
| GET | `/api/v1/billing/transactions?from=&to=&operation=&page=` | Platform transaction ledger (alias of transactions) |

### Analytics — `/api/v1/analytics`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/analytics/usage?from=&to=` | RADIUS data usage analytics: totals, daily breakdown, top users, termination reasons, recent sessions. Compared against same-length prior period. Filters by tenant's router IP addresses in `radacct.nasipaddress`. |

### Settings — `/api/v1/settings`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/settings/general` | Hotspot settings (auto-created on first read) |
| PUT | `/api/v1/settings/general` | Update: `{ dns_url, support_phone_1, support_phone_2, login_page_name, footer_note }` |
| GET | `/api/v1/settings/sms` | SMS settings + mock credit balance |
| PUT | `/api/v1/settings/sms` | Update SMS settings |
| GET | `/api/v1/settings/gateways` | Payment gateway configs |
| PUT | `/api/v1/settings/gateways` | Update gateway configs |
| GET | `/api/v1/settings/api-credentials` | Tenant API token (for external integrations) |

### Users (Staff + Customers) — `/api/v1/users`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/users/staff?search=&role=&page=` | Tenant admin accounts |
| POST | `/api/v1/users/staff` | Create admin. Body: `{ name, email, password, phone, role, site_id }` |
| GET | `/api/v1/users/customers?search=&page=` | Registered portal customers |
| GET | `/api/v1/users/roles?page=` | Custom roles |
| POST | `/api/v1/users/roles` | Create role with permissions JSONB |

### Support Intelligence — `/api/v1/support`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/support/intelligence` | Voucher activity metrics: avg login time, login rate, never-logged-in count, expired today, activity feed, paid-but-never-connected list |

### AI Assistant — `/api/v1/ai`

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/ai/chat` | Send message to Claude. Body: `{ message, history? }`. Returns streaming or JSON response with live tenant context injected into system prompt. |

### Features — `/api/v1/features`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/features` | Current plan limits and optional feature flags |
| POST | `/api/v1/features/request` | Submit feature/limit upgrade request. Body: `{ category, feature, reason }` |

### Router Requests — `/api/v1/router-requests`

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/router-requests` | Tenant submits a router setup request to iCube support. Body: `{ router_name, router_model?, site_name?, notes? }`. Triggers email to `support@icubeug.net`. |
| GET | `/api/v1/router-requests` | List this tenant's requests |

### Tenants — `/api/v1/tenants`

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/tenants` | List all tenants (used by superadmin views) |
| POST | `/api/v1/tenants` | Create tenant. Body: `{ name, slug, owner_email, plan }` |
| GET | `/api/v1/tenants/:id` | Single tenant |

### Stripe Webhooks — `/api/webhooks/stripe`

Raw body required. Mounted **before** `express.json()`. Processes `payment_intent.succeeded` and `payment_intent.payment_failed` events. Requires `STRIPE_WEBHOOK_SECRET`.

### WebSocket Terminal

```
ws://host/ws/terminal?token=<JWT>&router_id=<UUID>
```

Authenticated SSH passthrough to MikroTik routers over WireGuard VPN. JWT is validated on connection. Session piped by `src/remote/terminal.service.js`.

### Health check

```
GET /health → { status: 'ok'|'degraded', db: bool, redis: bool, ts: timestamp }
```

---

## Frontend Route Structure

The frontend (`isp-frontend/`) is a Next.js 14 App Router application on port 3001.

**API proxy:** All `/api/*` requests are rewritten to `http://139.84.247.205:3000` via `next.config.mjs`. For local dev, change this destination to `http://localhost:3000`.

**Auth guard:** `middleware.ts` checks the `icube_token` cookie for all `/admin/*` and `/agent/*` routes and redirects to `/auth/login` if missing.

### Route map

| Path | Description |
|---|---|
| `/` | Marketing landing page |
| `/auth/login` | Email + password → triggers OTP |
| `/auth/verify` | OTP entry → get JWT |
| `/auth/register` | New ISP signup |
| `/auth/forgot-password` | Request reset OTP |
| `/auth/reset-password` | Enter reset OTP + new password |
| `/login` | Legacy login redirect |
| `/register` | Legacy register redirect |
| **Admin** | |
| `/admin` | Dashboard (revenue, active users, router status) |
| `/admin/sites` | Manage hotspot sites |
| `/admin/router` | Router list |
| `/admin/router/[id]` | Single router detail + live charts |
| `/admin/routers` | Alternative router view |
| `/admin/vouchers` | Voucher management + batch generate |
| `/admin/packages` | Package (plan) management |
| `/admin/sales` | All voucher sales |
| `/admin/pppoe` | PPPoE subscriber management |
| `/admin/payments` | Payment history |
| `/admin/transactions` | Platform transaction ledger |
| `/admin/analytics` | RADIUS usage analytics with charts |
| `/admin/users/staff` | Staff/admin accounts |
| `/admin/users/customers` | Registered portal customers |
| `/admin/users/roles` | Role management |
| `/admin/agents` (via `/admin/float`) | Agent float accounts |
| `/admin/float` | Agent float balances |
| `/admin/float/purchases` | Float top-up history |
| `/admin/float/transactions` | Float ledger |
| `/admin/disbursements` | Disbursement records |
| `/admin/billing` | Billing invoices |
| `/admin/billing/payments` | Payment breakdown |
| `/admin/billing/transactions` | Ledger |
| `/admin/support` | Support intelligence dashboard |
| `/admin/ai` | AI assistant chat |
| `/admin/remote` | WebSocket SSH terminal to routers |
| `/admin/settings/general` | Hotspot settings |
| `/admin/settings/sms` | SMS settings |
| `/admin/settings/gateways` | Payment gateway config |
| `/admin/settings/routers` | Router management settings |
| `/admin/settings/routers/setup` | Router ZTP setup wizard |
| `/admin/settings/advanced` | Advanced settings |
| `/admin/settings/templates` | Portal template selection |
| `/admin/features` | Feature flags + plan limits |
| `/admin/limits/request` | Request limit increase |
| `/admin/help` | Help page |
| **Agent POS** | |
| `/agent` | Agent dashboard |
| `/agent/pos` | POS sale flow (select package → enter phone → confirm) |
| `/agent/sold-cards` | Agent's past sales |
| **Captive Portal** | |
| `/portal` | Portal index |
| `/portal/[slug]` | Branded captive portal for tenant (public) |
| **Superadmin** | |
| `/superadmin/login` | Superadmin login (no OTP) |
| `/superadmin/dashboard` | Platform-wide overview |
| `/superadmin/tenants` | All tenants list |
| `/superadmin/tenants/[id]` | Tenant detail + notes + usage |
| `/superadmin/revenue` | Platform revenue tracking |
| `/superadmin/staff` | Superadmin user management |
| `/superadmin/support` | Router requests from tenants |
| `/superadmin/settings` | Platform-level settings |
| `/superadmin/totp-setup` | TOTP setup for superadmin 2FA |

### Frontend API client (`lib/api.ts`)

Central typed API client. Key patterns:

- `getTenantId()` — reads `icube_tenant_id` from `localStorage` (set at login)
- All calls go to `BASE = '/api/v1'` which proxy through Next.js to the backend
- `apiCall(path, opts)` wraps `fetch` with auth headers and JSON handling
- Types exported: `Site`, `Router`, `RouterAnalytics`, `ZeroTouchResult`, `AnalyticsUsage`, etc.

---

## Database Schema

PostgreSQL 16. Schema files are in `src/schema/` and applied in numbered order. All migrations are `IF NOT EXISTS` safe and re-runnable. The `radcheck`/`radreply`/`radacct`/`nas` tables are standard FreeRADIUS tables colocated in the same database.

### Core tables

| Table | Description |
|---|---|
| `tenants` | Every ISP business. Key fields: `slug` (subdomain), `plan` (free/starter/growth/pro/enterprise), `status` (active/suspended/trial/cancelled), `max_sites`, `max_routers`, `trial_ends_at`. |
| `tenant_branding` | One row per tenant. Logo, colors, custom domain, support contact, captive portal template/theme. |
| `admins` | Tenant staff who log into the dashboard. `role`: admin/viewer. `password_hash` is bcrypt. `password_hash_bcrypt` is a migration-era duplicate. |
| `superadmin_users` | iCube staff (not tenants). Separate auth. Roles: superadmin/support/finance/tech. Default seeded user: `admin@icube.co.ug`. |
| `sites` | Physical hotspot locations belonging to a tenant. Tenant is limited to `tenants.max_sites`. |
| `routers` | Network routers at a site. Key fields: `brand`, `bearer_token` (prefix `icube_`), `install_token`, `router_token`, `wireguard_private_key`, `wireguard_peer_ip`, `vpn_port` (unique per router starting at 51820), `radius_secret`, `status`, `last_heartbeat_at`, `active_users`, `cpu_load`, `memory_used`, `tier_name`. |
| `packages` | Hotspot internet packages sold to customers. `duration_hrs`, `price_ugx`, `speed_mbps`, `download_mbps`, `upload_mbps`, `data_limit_mb`, `agent_commission_ugx`. |
| `vouchers` | Single-use internet access codes. `code` = RADIUS username = RADIUS password. `status`: unused/active/expired/used. `source`: admin/agent_pos/portal. |
| `payments` | Payment records for voucher purchases. `method`: mtn/airtel/cash/card/stripe. Links to `vouchers` and `sites`. |
| `agents` | Field sales agents. Authenticate with phone + PIN (not email+password). `wallet_balance` tracks earned commissions. `commission_pct` is per-agent. |
| `pos_sales` | Each sale made by an agent. Links agent, site, package, voucher, customer phone, commission earned. |
| `agent_wallet_txns` | Ledger of commission credits and withdrawals for agent wallets. |
| `customers` | Portal users who have registered. Distinct from `admins`. |
| `roles` | Custom roles with JSONB permissions array. |
| `pppoe_plans` | PPPoE broadband plans (weekly/monthly/quarterly). Separate from hotspot packages. |
| `pppoe_subscribers` | Home broadband subscribers. Each has a PPPoE username + password (bcrypt stored, plaintext pushed to RADIUS). |
| `pppoe_invoices` | Auto-generated invoices per billing cycle. |
| `pppoe_sessions` | PPPoE session records (bytes in/out, duration). |

### Financial tables

| Table | Description |
|---|---|
| `float_accounts` | Agent float balance. `use_float` flag determines if agent sells on credit (float) or only for collected cash. |
| `float_transactions` | Credit/debit ledger for agent float accounts. |
| `float_purchases` | Records of an admin topping up an agent's float balance. |
| `disbursements` | Mobile money payouts recorded by the ISP (e.g. paying an agent's commission to their phone). Status: pending/success/failed. |
| `platform_transactions` | Platform-level debit/credit ledger (`operation`: debit/credit). Used for tracking fees and balance. |
| `billing_invoices` | Invoices from iCube to tenants for platform subscription. |

### Router infrastructure tables

| Table | Description |
|---|---|
| `router_heartbeats` | Time-series heartbeat log (CPU, memory, users, WAN IP). Pruned to last 24 hours per router. |
| `router_metrics` | Alternative metrics table (time-series). |
| `router_setup_configs` | WAN/LAN interface, network config per router. |
| `router_requests` | Tenants submit router setup requests to iCube support. Status: pending/in_progress/completed/cancelled. |
| `platform_settings` | Key-value store for platform config. Critical keys: `icube_server_ip` (must be domain, not IP), `icube_portal_domain`, `icube_radius_ip`, `momo_platform_fee_pct`, `voucher_platform_fee_pct`. |

### FreeRADIUS tables (standard schema)

| Table | Description |
|---|---|
| `radcheck` | Auth rules. For vouchers: `username=code`, `attribute=Cleartext-Password`, `value=code`. For PPPoE: username + plaintext password. |
| `radreply` | Reply attributes. Sets `Mikrotik-Rate-Limit` (e.g. `10M/5M`), `Session-Timeout`, `Idle-Timeout`. |
| `radacct` | Session accounting records written by FreeRADIUS. Used by analytics. Joined to tenant via `nasipaddress` matching router `ip_address`. |
| `radpostauth` | Post-auth log (every login attempt). |
| `radgroupcheck` / `radgroupreply` / `radusergroup` | Group-based RADIUS policies (not currently used by application code). |
| `nas` | Network Access Servers. FreeRADIUS loads `radius_secret` from here via `nasname` = router IP. |

### Session and portal tables

| Table | Description |
|---|---|
| `hotspot_sessions` | Application-level session records (mirrors `radacct`). |
| `portal_payments` | Mobile money payment requests initiated from the captive portal. Status: pending/completed/failed/expired. Has `reference` for polling. |
| `ai_conversations` | Saved AI chat history per tenant admin. JSONB `messages` array. |
| `support_notes` | iCube staff notes on tenants. Also used for automated capacity alerts. |
| `hotspot_settings` | Per-tenant hotspot config (DNS, support phones, login page name). Auto-created with defaults on first read. |
| `sms_settings` | Per-tenant SMS provider config. |
| `feature_requests` | Tenant requests for additional features/limits. |

---

## Business Logic: How Key Systems Work

### Vouchers (hotspot access)

1. **Generation:** Admin or agent generates vouchers in bulk (up to 500 per call). Each voucher gets a unique `code` (digits/alpha, configurable format and length).
2. **RADIUS sync:** On creation, `syncVoucherToRadius()` writes to `radcheck` (Cleartext-Password = code) and `radreply` (Mikrotik-Rate-Limit from package). The voucher code becomes the hotspot username AND password.
3. **Activation:** Customer connects to WiFi, MikroTik hotspot redirects to captive portal, customer enters code. FreeRADIUS authenticates against `radcheck`. On first successful auth, `activated_at` is set and `expires_at` is computed from `duration_hrs`.
4. **Expiry:** Hourly cron sets `status = 'expired'` for vouchers where `expires_at < NOW()` and calls `sweepExpiredVoucherRadiusEntries()` to remove expired entries from `radcheck`/`radreply`.
5. **Agent POS flow:** Agent logs in → selects package → enters customer phone → voucher auto-generated → payment recorded → commission credited to agent wallet → SMS with voucher code sent to customer.

### PPPoE (home broadband)

1. **Subscriber creation:** Admin creates subscriber with username/password. `pppoe.service.js` hashes the password for DB storage, pushes plaintext to RADIUS (`radcheck`/`radreply`), pushes PPPoE profile to MikroTik via API, generates first invoice, sends welcome SMS.
2. **Auto-billing:** Daily cron at 04:00 UTC runs `runBillingCycle()`. For each active subscriber with `next_billing_date <= today`, it attempts mobile money collection (MTN for 077/078/076/039 prefixes, Airtel for 070/075/074).
3. **Non-payment:** If collection fails, a grace period of 3 days applies. After that, `suspendPPPoEUser()` disables the subscriber on MikroTik and sets `status = 'suspended'` in DB. SMS reminders sent throughout.
4. **Speed limits:** Bandwidth enforced via `Mikrotik-Rate-Limit` RADIUS reply attribute (e.g. `10M/5M` for 10 Mbps down / 5 Mbps up). Burst limits computed from plan if `burst_download_mbps` is set.

### Agent float system

Float = prepaid credit given to an agent by the admin so the agent can sell vouchers even when the customer pays later.

1. Admin tops up an agent's float account (`POST /api/v1/float/purchase`), which credits `float_accounts.balance`.
2. When `float_accounts.use_float = true`, the agent's sales deduct from float rather than requiring immediate cash collection.
3. When the agent collects cash from customers, the admin reconciles and records a disbursement (`POST /api/v1/disbursements`) to pay out the agent's accumulated commission.
4. Agent commission is separately tracked in `agent_wallet_txns` and credited to `agents.wallet_balance` on each sale.

### Disbursements

Disbursements are outgoing mobile money payments the ISP makes — primarily paying agents their commissions. The system records the intent (`status: pending`) but does not automatically trigger the mobile money API. The admin manually initiates the actual transfer outside the platform, then the record serves as the ledger entry.

### Router tiers and ZTP

`src/routers/router-intelligence.js` detects the router model and assigns a tier (SOHO/SMB/Enterprise) which determines:
- Subnet size (e.g. `/24` for SOHO, `/22` for Enterprise)
- DHCP pool range
- Max recommended concurrent users

On zero-touch provisioning (`POST /api/v1/routers/zero-touch`):
1. WireGuard keys are generated via `wg genkey` / `wg pubkey` (falls back to random bytes if wireguard-tools not installed)
2. Next available VPN port is assigned (starting 51820, sequential)
3. Next available peer IP is assigned (`10.99.0.<index>`)
4. Unique `bearer_token` (`icube_` prefix) and `install_token` are generated
5. A complete MikroTik `.rsc` script is returned containing all network config, WireGuard setup, RADIUS config, hotspot setup, and a heartbeat scheduler

The router runs the script, which ends with a `POST /api/v1/router/register` call (bearer-auth) to record itself as online.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Full PostgreSQL connection string. Format: `postgresql://user:pass@host:5432/dbname`. Used by `pg.Pool`. |
| `DB_PASSWORD` | Docker only | Password passed to postgres docker container. |
| `REDIS_URL` | Yes | Redis connection URL. Default: `redis://localhost:6379`. Used for OTP storage (10-min TTL), tenant cache (5-min TTL), AI cache (2-min TTL). |
| `JWT_SECRET` | Yes | Signs/verifies admin JWTs. Must be a long random string (min 32 chars). Changing this invalidates all active sessions. |
| `AGENT_JWT_SECRET` | Yes | Signs/verifies agent JWTs (12-hour expiry). Can be same as `JWT_SECRET` in dev but should differ in prod. |
| `SUPERADMIN_JWT_SECRET` | Yes | Signs/verifies superadmin JWTs. Separate secret prevents tenant JWTs from being used at superadmin endpoints. |
| `SA_SECRET` | Yes | Alias for `SUPERADMIN_JWT_SECRET` (used in some routes). Set both to the same value. |
| `ANTHROPIC_API_KEY` | No | Claude API key for AI assistant. If unset, AI routes will fail with a 500. |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for card payments. If unset, Stripe routes return errors. |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signature secret (from Stripe dashboard). Required for webhook validation. |
| `MTN_API_KEY` | No | MTN Mobile Money API key (Uganda). Used in PPPoE auto-billing and portal payments. |
| `MTN_API_SECRET` | No | MTN API secret. |
| `MTN_COLLECTION_URL` | No | MTN API base URL. Use `https://sandbox.momodeveloper.mtn.com` for testing. |
| `MTN_SUBSCRIPTION_KEY` | No | MTN Ocp-Apim-Subscription-Key header value. |
| `MTN_TARGET_ENVIRONMENT` | No | `sandbox` or `production`. |
| `AIRTEL_CLIENT_ID` | No | Airtel Money API client ID (Uganda). |
| `AIRTEL_CLIENT_SECRET` | No | Airtel Money API secret. |
| `AIRTEL_BASE_URL` | No | Airtel API base URL. Default: `https://openapi.airtel.africa`. |
| `AIRTEL_COUNTRY` | No | Country code. Default: `UG`. |
| `AIRTEL_CURRENCY` | No | Currency code. Default: `UGX`. |
| `SMS_PROVIDER` | No | SMS provider. Currently only `africas_talking` is implemented. |
| `SMS_API_KEY` | No | Africa's Talking API key. If unset, SMS is silently skipped (no error). |
| `SMS_USERNAME` | No | Africa's Talking username. `sandbox` for testing. |
| `SMS_SENDER_ID` | No | SMS sender name shown to recipients. Default: `iCube`. |
| `EMAIL_FROM` | No | SMTP sender address. Default: `icube.support@icubeug.net`. |
| `EMAIL_PASSWORD` | No | SMTP password. |
| `EMAIL_HOST` | No | SMTP host. Default: `smtp.zoho.com`. |
| `EMAIL_PORT` | No | SMTP port. Default: `465`. |
| `PORT` | No | HTTP server port. Default: `3000`. |
| `NODE_ENV` | No | `production` disables the `/api/auth/dev-otp` endpoint. |
| `PLATFORM_DOMAIN` | No | Base domain for tenant subdomains. Default: `icubeug.net`. Tenants get `{slug}.icubeug.net`. |
| `WG_SERVER_PUBLIC_KEY` | No | WireGuard server public key. Embedded verbatim in all ZTP scripts. If unset, scripts contain `[SERVER_PUBLIC_KEY]` placeholder. |
| `WG_SERVER_URL` | No | WireGuard server hostname/IP. Default: `139.84.247.205`. Used in docker-compose WireGuard container config. |
| `WG_SERVER_PORT` | No | WireGuard server listen port. Default: `51820`. |
| `WG_CONFIG_DIR` | No | Directory for WireGuard peer config files. Default: `/config/wireguard`. |
| `VPN_IPSEC_SECRET` | No | IPSec pre-shared key embedded in ZTP scripts for routers that use IPSec instead of WireGuard. Default: `icube-ipsec-2024`. |

---

## Deployment Workflow

### Backend (production server)

The API runs directly on the server (not in Docker for the frontend) or via Docker Compose. The production server is at `139.84.247.205`.

```bash
# SSH into server
ssh root@139.84.247.205

# Navigate to backend
cd /path/to/isp-upgrade

# Pull latest code
git pull origin main

# Install any new dependencies
npm install --production

# Apply new migrations (if any schema files changed)
psql $DATABASE_URL -f src/schema/<new_migration>.sql

# Restart the API process (PM2 recommended)
pm2 restart isp-api
# or with Docker:
docker-compose pull api && docker-compose up -d api
```

**Never build on the server.** The backend is plain Node.js — `node src/app.js` — no build step needed.

### Frontend (production)

```bash
# On your local Mac
cd isp-frontend

# Build locally
npm run build

# Copy build output to server (adjust path as needed)
rsync -avz .next/ root@139.84.247.205:/path/to/isp-frontend/.next/
rsync -avz public/ root@139.84.247.205:/path/to/isp-frontend/public/

# On server — restart Next.js
pm2 restart isp-frontend
# or: pm2 start "npm start" --name isp-frontend
```

Alternatively, build on CI and push the `.next/` directory artifact to the server.

### Adding a new schema migration

1. Create `src/schema/NNN_description.sql` with `IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS` guards
2. Test locally: `psql isp_db -f src/schema/NNN_description.sql`
3. Apply on production: `psql $DATABASE_URL -f src/schema/NNN_description.sql`
4. No restart needed for schema-only changes (the pool uses existing connections)

### Adding a new API route

1. Create `src/<module>/<module>.routes.js`
2. Add `app.use('/api/v1/<module>', require('./<module>/<module>.routes'))` in `src/app.js`
3. If routes need tenant context, add them after the `resolveTenant` middleware registration block in `app.js`

---

## Cron Jobs (node-cron, runs inside API process)

| Schedule | Time (UTC) | Job |
|---|---|---|
| `0 4 * * *` | 04:00 daily | PPPoE billing cycle — attempt mobile money collection, suspend non-payers after 3-day grace |
| `0 * * * *` | Every hour | Expire vouchers (`status='expired'` where `expires_at < NOW()`), sweep RADIUS entries, bust AI cache |
| `*/2 * * * *` | Every 2 min | Sweep offline routers (mark offline if no heartbeat for 5 min), bust AI cache keys |
