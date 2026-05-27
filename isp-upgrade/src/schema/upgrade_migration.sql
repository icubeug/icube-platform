-- =============================================================
-- ISP SYSTEM UPGRADE — FULL SCHEMA MIGRATION
-- Run after existing base schema (sites, routers, vouchers, etc.)
-- =============================================================

-- ─────────────────────────────────────────────
-- PHASE 1: AGENT / POS SYSTEM
-- ─────────────────────────────────────────────

CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(120) NOT NULL,
  phone         VARCHAR(20) NOT NULL UNIQUE,
  pin_hash      TEXT NOT NULL,                    -- bcrypt hashed PIN for POS login
  site_id       UUID REFERENCES sites(id),        -- primary site assignment
  commission_pct NUMERIC(5,2) DEFAULT 5.00,       -- % commission per sale
  wallet_balance NUMERIC(12,2) DEFAULT 0.00,      -- accumulated commissions (UGX)
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pos_sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  site_id       UUID NOT NULL REFERENCES sites(id),
  package_id    UUID NOT NULL REFERENCES packages(id),
  customer_phone VARCHAR(20) NOT NULL,
  voucher_id    UUID REFERENCES vouchers(id),      -- auto-generated on sale
  amount_ugx    NUMERIC(12,2) NOT NULL,
  commission_ugx NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30) DEFAULT 'cash' CHECK (payment_method IN ('cash','mtn','airtel','card')),
  sms_sent      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_wallet_txns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  type          VARCHAR(20) CHECK (type IN ('commission','withdrawal','adjustment')),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PHASE 1B: STRIPE / CARD PAYMENTS
-- ─────────────────────────────────────────────

ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  stripe_payment_intent_id TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  stripe_customer_id TEXT;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  card_last4 VARCHAR(4);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS
  card_brand VARCHAR(20);   -- visa, mastercard, etc.

-- ─────────────────────────────────────────────
-- PHASE 2: PPPoE BILLING
-- ─────────────────────────────────────────────

CREATE TABLE pppoe_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id       UUID REFERENCES sites(id),
  full_name     VARCHAR(150) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(150),
  username      VARCHAR(80) NOT NULL UNIQUE,      -- PPPoE username
  password_hash TEXT NOT NULL,                    -- stored hashed; pushed to RADIUS plaintext
  plan_id       UUID REFERENCES pppoe_plans(id),
  router_id     UUID REFERENCES routers(id),
  ip_address    INET,                             -- static IP if assigned
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  next_billing_date DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pppoe_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  download_mbps INTEGER NOT NULL,
  upload_mbps   INTEGER NOT NULL,
  price_ugx     NUMERIC(12,2) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly','monthly','quarterly')),
  burst_download_mbps INTEGER,
  burst_upload_mbps   INTEGER,
  data_cap_gb   INTEGER,                          -- NULL = unlimited
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pppoe_invoices (
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

CREATE TABLE pppoe_sessions (
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
-- PHASE 2B: MULTI-ROUTER ADAPTER REGISTRY
-- ─────────────────────────────────────────────

ALTER TABLE routers ADD COLUMN IF NOT EXISTS
  brand VARCHAR(30) DEFAULT 'mikrotik'
  CHECK (brand IN ('mikrotik','ruijie','ubiquiti_unifi','tplink_omada','cisco','huawei','dlink','openwrt'));

ALTER TABLE routers ADD COLUMN IF NOT EXISTS
  adapter_config JSONB DEFAULT '{}';
  -- Stores brand-specific config:
  -- MikroTik:  { "api_port": 8728, "use_ssl": false }
  -- UniFi:     { "controller_url": "...", "site_id": "default", "api_key": "..." }
  -- Omada:     { "controller_url": "...", "omada_cid": "...", "site_id": "..." }
  -- Ruijie:    { "base_url": "...", "ap_group": "..." }

-- ─────────────────────────────────────────────
-- PHASE 3: MULTI-TENANCY
-- ─────────────────────────────────────────────

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  slug          VARCHAR(60) NOT NULL UNIQUE,       -- used in subdomain: slug.yourplatform.com
  owner_email   VARCHAR(150) NOT NULL,
  plan          VARCHAR(30) DEFAULT 'starter' CHECK (plan IN ('starter','pro','enterprise')),
  max_sites     INTEGER DEFAULT 5,
  max_routers   INTEGER DEFAULT 20,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','trial')),
  trial_ends_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_branding (
  tenant_id     UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url      TEXT,
  primary_color VARCHAR(7) DEFAULT '#1D9E75',      -- hex
  secondary_color VARCHAR(7) DEFAULT '#378ADD',
  company_name  VARCHAR(150),
  support_phone VARCHAR(20),
  support_email VARCHAR(150),
  custom_domain TEXT,                              -- e.g. isp.client.co.ug
  favicon_url   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_billing (
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

-- Add tenant_id FK to all major tables (run after creating tenants table)
ALTER TABLE sites     ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE routers   ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE vouchers  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE packages  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE payments  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE admins    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Row-level security: each query must include tenant_id = current_tenant
-- Enable RLS on all tenant-scoped tables
ALTER TABLE sites     ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON sites
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation ON routers
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
CREATE POLICY tenant_isolation ON vouchers
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ─────────────────────────────────────────────
-- PHASE 4: REMOTE ACCESS & AUDIT
-- ─────────────────────────────────────────────

CREATE TABLE remote_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id     UUID NOT NULL REFERENCES routers(id),
  admin_id      UUID NOT NULL REFERENCES admins(id),
  tenant_id     UUID REFERENCES tenants(id),
  session_token TEXT NOT NULL UNIQUE,
  ws_channel    TEXT,                             -- WebSocket room ID
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  commands_run  INTEGER DEFAULT 0
);

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  actor_id      UUID,                             -- admin or agent
  actor_type    VARCHAR(20),                      -- 'admin' | 'agent' | 'system'
  action        VARCHAR(80) NOT NULL,             -- e.g. 'voucher.created', 'router.restarted'
  entity_type   VARCHAR(60),
  entity_id     UUID,
  payload       JSONB DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX idx_audit_actor       ON audit_logs (actor_id, created_at DESC);

-- ─────────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────────

CREATE INDEX idx_agents_phone      ON agents (phone);
CREATE INDEX idx_pos_sales_agent   ON pos_sales (agent_id, created_at DESC);
CREATE INDEX idx_pppoe_username    ON pppoe_subscribers (username);
CREATE INDEX idx_pppoe_status      ON pppoe_subscribers (status, next_billing_date);
CREATE INDEX idx_tenants_slug      ON tenants (slug);
CREATE INDEX idx_tenant_branding   ON tenant_branding (custom_domain);
