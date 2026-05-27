-- =============================================================
-- ISP PLATFORM — MIGRATION 002 — New tables for full platform
-- =============================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,
  permissions JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Customers (registered portal users)
CREATE TABLE IF NOT EXISTS customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name         VARCHAR(120),
  phone        VARCHAR(20),
  email        VARCHAR(150),
  site_id      UUID REFERENCES sites(id) ON DELETE SET NULL,
  role_id      UUID REFERENCES roles(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone  ON customers(phone);

-- Float accounts per agent
CREATE TABLE IF NOT EXISTS float_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id   UUID REFERENCES agents(id) ON DELETE CASCADE,
  balance    NUMERIC(14,2) DEFAULT 0,
  use_float  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id)
);

-- Float transaction ledger
CREATE TABLE IF NOT EXISTS float_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  operation   VARCHAR(20) CHECK(operation IN ('credit','debit')),
  amount      NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  memo        TEXT,
  request_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_float_txns_agent ON float_transactions(agent_id, created_at DESC);

-- Float purchases (admin topping up agent float)
CREATE TABLE IF NOT EXISTS float_purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES agents(id) ON DELETE CASCADE,
  seller_id     UUID REFERENCES admins(id) ON DELETE SET NULL,
  amount        NUMERIC(14,2) NOT NULL,
  created_float NUMERIC(14,2) NOT NULL,
  payer         VARCHAR(30),
  status        VARCHAR(20) DEFAULT 'completed',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Disbursements
CREATE TABLE IF NOT EXISTS disbursements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  phone          VARCHAR(20) NOT NULL,
  payee          VARCHAR(120),
  amount_ugx     NUMERIC(14,2) NOT NULL,
  transaction_id TEXT,
  charges        NUMERIC(14,2) DEFAULT 0,
  reason         TEXT,
  status         VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','success','failed')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disbursements_tenant ON disbursements(tenant_id, created_at DESC);

-- Platform transactions (debit/credit ledger for the ISP's account)
CREATE TABLE IF NOT EXISTS platform_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id TEXT,
  request_id     TEXT,
  operation      VARCHAR(20) CHECK(operation IN ('debit','credit')),
  note           TEXT,
  amount         NUMERIC(14,2) NOT NULL,
  balance_after  NUMERIC(14,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_txns_tenant ON platform_transactions(tenant_id, created_at DESC);

-- Billing invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL,
  status      VARCHAR(20) DEFAULT 'paid' CHECK(status IN ('paid','pending','failed')),
  payer       VARCHAR(80),
  payer_name  VARCHAR(120),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Hotspot settings (one row per tenant)
CREATE TABLE IF NOT EXISTS hotspot_settings (
  tenant_id       UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  dns_url         TEXT,
  support_phone_1 VARCHAR(20),
  support_phone_2 VARCHAR(20),
  login_page_name VARCHAR(50),
  router_identity TEXT,
  footer_note     TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- SMS settings
CREATE TABLE IF NOT EXISTS sms_settings (
  tenant_id                 UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  agent_sales_sms           BOOLEAN DEFAULT TRUE,
  realtime_momo_sms         BOOLEAN DEFAULT TRUE,
  delayed_reminder_minutes  INTEGER,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Feature requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  category   VARCHAR(80),
  feature    VARCHAR(120),
  reason     TEXT,
  status     VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Router metrics time-series
CREATE TABLE IF NOT EXISTS router_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id     UUID REFERENCES routers(id) ON DELETE CASCADE,
  cpu_load      NUMERIC(5,2),
  memory_usage  NUMERIC(5,2),
  active_users  INTEGER,
  bytes_in      BIGINT DEFAULT 0,
  bytes_out     BIGINT DEFAULT 0,
  recorded_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_router_metrics ON router_metrics(router_id, recorded_at DESC);

-- Add missing columns to existing tables
ALTER TABLE vouchers   ADD COLUMN IF NOT EXISTS use_case TEXT DEFAULT 'admin_sale';
ALTER TABLE vouchers   ADD COLUMN IF NOT EXISTS note     TEXT;
ALTER TABLE vouchers   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE vouchers   ADD COLUMN IF NOT EXISTS first_login_at TIMESTAMPTZ;
ALTER TABLE vouchers   ADD COLUMN IF NOT EXISTS voucher_code TEXT;
ALTER TABLE payments   ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE payments   ADD COLUMN IF NOT EXISTS voucher_code TEXT;
ALTER TABLE packages   ADD COLUMN IF NOT EXISTS agent_commission_ugx NUMERIC(12,2) DEFAULT 0;
ALTER TABLE packages   ADD COLUMN IF NOT EXISTS data_limit_mb BIGINT;
ALTER TABLE packages   ADD COLUMN IF NOT EXISTS upload_mbps INTEGER;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS board_name TEXT;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS firmware_version TEXT;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS cpu_load NUMERIC(5,2) DEFAULT 0;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS uptime_seconds BIGINT DEFAULT 0;
ALTER TABLE routers    ADD COLUMN IF NOT EXISTS ssh_port INTEGER DEFAULT 22;
ALTER TABLE admins     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE admins     ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE admins     ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE admins     ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admins     ADD COLUMN IF NOT EXISTS requires_printer BOOLEAN DEFAULT FALSE;

-- Seed default roles for dev tenant
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'Super Admin',       '["all"]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'Hotspot Admin',     '["hotspot","sales","vouchers"]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'Agent',             '["sales","pos"]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'Customer Support',  '["vouchers","support"]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'Customer',          '["portal"]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;
INSERT INTO roles (tenant_id, name, permissions)
SELECT id, 'User',              '[]'::jsonb FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT DO NOTHING;

-- Seed hotspot settings
INSERT INTO hotspot_settings (tenant_id, dns_url, support_phone_1, login_page_name, router_identity, footer_note)
SELECT id, 'https://dns.yourplatform.net', '+256700000000', 'Dev ISP Hotspot', 'MikroTik-DEV-01',
  'Welcome to Dev ISP. For support call +256700000000.'
FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed SMS settings
INSERT INTO sms_settings (tenant_id, agent_sales_sms, realtime_momo_sms)
SELECT id, true, true
FROM tenants WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3'
ON CONFLICT (tenant_id) DO NOTHING;

-- Seed float accounts for agents
INSERT INTO float_accounts (tenant_id, agent_id, balance, use_float)
SELECT a.tenant_id, a.id, 250000, TRUE
FROM agents a
WHERE NOT EXISTS (SELECT 1 FROM float_accounts fa WHERE fa.agent_id = a.id)
ON CONFLICT (agent_id) DO NOTHING;

-- Seed some platform transactions
INSERT INTO platform_transactions (tenant_id, transaction_id, operation, note, amount, balance_after, created_at)
SELECT
  'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3',
  'TXN-' || lpad(gs::text, 6, '0'),
  CASE WHEN gs % 5 = 0 THEN 'debit' ELSE 'credit' END,
  CASE WHEN gs % 5 = 0 THEN 'SMS deduction' ELSE 'Voucher sale proceeds' END,
  CASE WHEN gs % 5 = 0 THEN 35 ELSE (random()*50000+5000)::NUMERIC(14,2) END,
  (random()*500000+100000)::NUMERIC(14,2),
  NOW() - (gs * '1 hour'::INTERVAL)
FROM generate_series(1, 30) gs
ON CONFLICT DO NOTHING;

-- Seed disbursements
INSERT INTO disbursements (tenant_id, phone, payee, amount_ugx, transaction_id, charges, reason, status, created_at)
SELECT
  'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3',
  '+2567' || lpad((70000000 + gs * 1337)::text, 8, '0'),
  'Agent ' || gs,
  (gs * 25000 + 10000)::NUMERIC,
  'DISB-' || lpad(gs::text, 6, '0'),
  500,
  'Agent commission payout',
  'success',
  NOW() - (gs * '2 days'::INTERVAL)
FROM generate_series(1, 10) gs
ON CONFLICT DO NOTHING;

-- Seed billing invoices
INSERT INTO billing_invoices (tenant_id, description, amount, status, payer, payer_name, created_at)
SELECT
  'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3',
  CASE gs % 3
    WHEN 0 THEN 'Monthly Subscription — Starter Plan'
    WHEN 1 THEN 'SMS Credit Top-up'
    ELSE 'Platform Fee — May 2026'
  END,
  CASE gs % 3 WHEN 0 THEN 50000 WHEN 1 THEN 25000 ELSE 10000 END,
  'paid', 'levilubs@gmail.com', 'Dev Admin',
  NOW() - (gs * '15 days'::INTERVAL)
FROM generate_series(1, 6) gs
ON CONFLICT DO NOTHING;

-- Seed some customers
INSERT INTO customers (tenant_id, name, phone, email, created_at)
SELECT
  'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3',
  'Customer ' || gs,
  '+2567' || lpad((70000000 + gs * 999)::text, 8, '0'),
  'customer' || gs || '@dev.local',
  NOW() - (gs * '3 days'::INTERVAL)
FROM generate_series(1, 20) gs
ON CONFLICT DO NOTHING;

-- Seed router metrics (last 60 data points per router)
INSERT INTO router_metrics (router_id, cpu_load, memory_usage, active_users, bytes_in, bytes_out, recorded_at)
SELECT
  r.id,
  (20 + random() * 60)::NUMERIC(5,2),
  (40 + random() * 40)::NUMERIC(5,2),
  (5 + (random() * 30)::INT),
  (random() * 50000000)::BIGINT,
  (random() * 20000000)::BIGINT,
  NOW() - (gs * '5 minutes'::INTERVAL)
FROM routers r, generate_series(1, 60) gs
ON CONFLICT DO NOTHING;

-- Update routers with board info
UPDATE routers SET
  board_name = 'RB4011iGS+5HacQ2HnD',
  model = 'RouterBOARD 4011',
  firmware_version = '7.14.2',
  cpu_load = 24,
  uptime_seconds = 120000,
  ssh_port = 22
WHERE brand = 'mikrotik' AND board_name IS NULL;

-- Update vouchers with use_case
UPDATE vouchers SET use_case = CASE
  WHEN customer_phone IS NOT NULL THEN 'mobile_money_sale'
  ELSE 'admin_sale'
END WHERE use_case IS NULL OR use_case = 'admin_sale';

-- Populate voucher_code on payments from vouchers
UPDATE payments p
SET voucher_code = v.code
FROM vouchers v
WHERE p.voucher_id = v.id AND p.voucher_code IS NULL;
