-- =============================================================
-- ISP PLATFORM — FULL ORDERED MIGRATION
-- Combines base + upgrade in dependency order
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- BASE TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          VARCHAR(120),
  role          VARCHAR(30) DEFAULT 'admin' CHECK (role IN ('superadmin','admin','viewer')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  location      TEXT,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id) ON DELETE SET NULL,
  name          VARCHAR(120) NOT NULL,
  ip_address    INET NOT NULL,
  api_port      INTEGER DEFAULT 8728,
  api_username  VARCHAR(80),
  api_password  TEXT,
  status        VARCHAR(20) DEFAULT 'online' CHECK (status IN ('online','offline','unreachable')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  speed_mbps    INTEGER,
  duration_hrs  INTEGER NOT NULL,
  price_ugx     NUMERIC(12,2) NOT NULL,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id) ON DELETE CASCADE,
  package_id    UUID REFERENCES packages(id),
  code          VARCHAR(30) NOT NULL UNIQUE,
  status        VARCHAR(20) DEFAULT 'unused' CHECK (status IN ('unused','active','expired','used')),
  customer_phone VARCHAR(20),
  activated_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID REFERENCES sites(id),
  voucher_id    UUID REFERENCES vouchers(id),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  method        VARCHAR(30) CHECK (method IN ('mtn','airtel','cash','card','stripe')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  reference     TEXT,
  customer_phone VARCHAR(20),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PHASE 3 FIRST: MULTI-TENANCY (others depend on it)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(60) NOT NULL UNIQUE,
  owner_email   VARCHAR(150) NOT NULL,
  plan          VARCHAR(30) DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  max_sites     INTEGER DEFAULT 5,
  max_routers   INTEGER DEFAULT 20,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','trial')),
  trial_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id     UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url      TEXT,
  primary_color VARCHAR(7) DEFAULT '#1D9E75',
  secondary_color VARCHAR(7) DEFAULT '#378ADD',
  company_name  VARCHAR(150),
  support_phone VARCHAR(20),
  support_email VARCHAR(150),
  custom_domain TEXT,
  favicon_url   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_billing (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  amount_usd    NUMERIC(10,2) NOT NULL,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending',
  stripe_invoice_id TEXT,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add tenant_id to base tables
ALTER TABLE admins    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sites     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE routers   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE vouchers  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE packages  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Multi-router adapter columns
ALTER TABLE routers ADD COLUMN IF NOT EXISTS brand VARCHAR(30) DEFAULT 'mikrotik'
  CHECK (brand IN ('mikrotik','ruijie','ubiquiti_unifi','tplink_omada','cisco','huawei','dlink','openwrt'));
ALTER TABLE routers ADD COLUMN IF NOT EXISTS adapter_config JSONB DEFAULT '{}';

-- ─────────────────────────────────────────────
-- PHASE 1: AGENT / POS SYSTEM
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(20) NOT NULL UNIQUE,
  pin_hash      TEXT NOT NULL,
  site_id       UUID REFERENCES sites(id),
  commission_pct NUMERIC(5,2) DEFAULT 5.00,
  wallet_balance NUMERIC(12,2) DEFAULT 0.00,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  site_id       UUID NOT NULL REFERENCES sites(id),
  package_id    UUID NOT NULL REFERENCES packages(id),
  customer_phone VARCHAR(20) NOT NULL,
  voucher_id    UUID REFERENCES vouchers(id),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  commission_ugx NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash','mtn','airtel','card')),
  sms_sent      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_wallet_txns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  type          VARCHAR(20) CHECK (type IN ('commission','withdrawal','adjustment')),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe columns on payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20);

-- ─────────────────────────────────────────────
-- PHASE 2: PPPoE BILLING
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pppoe_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  download_mbps INTEGER NOT NULL,
  upload_mbps   INTEGER NOT NULL,
  price_ugx     NUMERIC(12,2) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly','monthly','quarterly')),
  burst_download_mbps INTEGER,
  burst_upload_mbps   INTEGER,
  data_cap_gb   INTEGER,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pppoe_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id       UUID REFERENCES sites(id),
  full_name     VARCHAR(150) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(150),
  username      VARCHAR(80) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  plan_id       UUID REFERENCES pppoe_plans(id),
  router_id     UUID REFERENCES routers(id),
  ip_address    INET,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  next_billing_date DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pppoe_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES pppoe_subscribers(id),
  plan_id       UUID NOT NULL REFERENCES pppoe_plans(id),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  due_date      DATE NOT NULL,
  paid_at       TIMESTAMPTZ,
  payment_id    UUID REFERENCES payments(id),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pppoe_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES pppoe_subscribers(id),
  nas_ip        INET,
  framed_ip     INET,
  bytes_in      BIGINT DEFAULT 0,
  bytes_out     BIGINT DEFAULT 0,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  terminate_cause VARCHAR(60)
);

-- ─────────────────────────────────────────────
-- PHASE 4: REMOTE ACCESS & AUDIT
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS remote_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id     UUID NOT NULL REFERENCES routers(id),
  admin_id      UUID NOT NULL REFERENCES admins(id),
  tenant_id     UUID REFERENCES tenants(id),
  session_token TEXT NOT NULL UNIQUE,
  ws_channel    TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  commands_run  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  actor_id      UUID,
  actor_type    VARCHAR(20),
  action        VARCHAR(80) NOT NULL,
  entity_type   VARCHAR(60),
  entity_id     UUID,
  payload       JSONB DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security
ALTER TABLE sites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_vouchers_code        ON vouchers (code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status      ON vouchers (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_site        ON payments (site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time    ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor          ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_phone         ON agents (phone);
CREATE INDEX IF NOT EXISTS idx_pos_sales_agent      ON pos_sales (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pppoe_username       ON pppoe_subscribers (username);
CREATE INDEX IF NOT EXISTS idx_pppoe_status         ON pppoe_subscribers (status, next_billing_date);
CREATE INDEX IF NOT EXISTS idx_tenants_slug         ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenant_branding      ON tenant_branding (custom_domain);
