-- =============================================================
-- iCube Platform — Complete Base Schema
-- All tables in dependency order, all IF NOT EXISTS safe
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- 1. TENANTS (must be first — everything references this)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(150) NOT NULL,
  business_name    VARCHAR(150),
  slug             VARCHAR(60)  NOT NULL UNIQUE,
  owner_email      VARCHAR(150),
  owner_name       VARCHAR(150),
  owner_phone      VARCHAR(30),
  phone            VARCHAR(30),
  plan             VARCHAR(30)  DEFAULT 'free' CHECK (plan IN ('free','starter','growth','pro','enterprise')),
  status           VARCHAR(20)  DEFAULT 'trial'   CHECK (status IN ('active','suspended','trial','cancelled')),
  max_sites        INTEGER      DEFAULT 5,
  max_routers      INTEGER      DEFAULT 20,
  trial_ends_at    TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ  DEFAULT NOW(),
  password_hash    TEXT,
  address          TEXT,
  country          VARCHAR(80)  DEFAULT 'Uganda',
  notes            TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug  ON tenants (slug);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants (owner_email);

-- ─────────────────────────────────────────────────────────────
-- 2. TENANT BRANDING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_branding (
  tenant_id       UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url        TEXT,
  primary_color   VARCHAR(7)   DEFAULT '#1D9E75',
  secondary_color VARCHAR(7)   DEFAULT '#378ADD',
  company_name    VARCHAR(150),
  support_phone   VARCHAR(30),
  support_email   VARCHAR(150),
  custom_domain   TEXT,
  favicon_url     TEXT,
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_domain ON tenant_branding (custom_domain);

-- ─────────────────────────────────────────────────────────────
-- 3. ADMINS (tenant staff)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email                VARCHAR(150) NOT NULL UNIQUE,
  password_hash        TEXT         NOT NULL,
  password_hash_bcrypt TEXT,
  name                 VARCHAR(120),
  phone                VARCHAR(30),
  role                 VARCHAR(30)  DEFAULT 'admin' CHECK (role IN ('superadmin','admin','viewer')),
  site_id              UUID,
  last_login_at        TIMESTAMPTZ,
  requires_printer     BOOLEAN      DEFAULT FALSE,
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email     ON admins (email);
CREATE INDEX IF NOT EXISTS idx_admins_tenant_id ON admins (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 4. SUPERADMIN USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(30)  DEFAULT 'support' CHECK (role IN ('superadmin','support','finance','tech')),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed default superadmin (password: icube-admin-2026)
INSERT INTO superadmin_users (name, email, password_hash, role)
VALUES (
  'iCube Admin',
  'admin@icube.co.ug',
  '$2b$10$tj2X96z9tDbGlt/yxP0iROxQKhMWgMHhCSTbduEkru96DB.MWYUyO',
  'superadmin'
) ON CONFLICT (email) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. SITES (hotspot locations)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(120) NOT NULL,
  location   TEXT,
  status     VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_tenant ON sites (tenant_id);

-- ─────────────────────────────────────────────────────────────
-- 6. ROUTERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id               UUID REFERENCES sites(id)   ON DELETE SET NULL,
  name                  VARCHAR(120) NOT NULL,
  ip_address            INET         NOT NULL,
  api_port              INTEGER      DEFAULT 8728,
  api_username          VARCHAR(80),
  api_password          TEXT,
  ssh_port              INTEGER      DEFAULT 22,
  brand                 VARCHAR(30)  DEFAULT 'mikrotik'
    CHECK (brand IN ('mikrotik','ruijie','ubiquiti_unifi','tplink_omada','cisco','huawei','dlink','openwrt')),
  adapter_config        JSONB        DEFAULT '{}',
  status                VARCHAR(20)  DEFAULT 'online' CHECK (status IN ('online','offline','unreachable')),
  vpn_username          VARCHAR(80),
  vpn_password          TEXT,
  vpn_connected         BOOLEAN      DEFAULT FALSE,
  vpn_ip                INET,
  radius_secret         VARCHAR(80),
  last_heartbeat_at     TIMESTAMPTZ,
  setup_completed       BOOLEAN      DEFAULT FALSE,
  board_name            VARCHAR(80),
  firmware_version      VARCHAR(40),
  uptime_seconds        BIGINT       DEFAULT 0,
  wireguard_private_key TEXT,
  wireguard_public_key  TEXT,
  wireguard_peer_ip     INET,
  wireguard_config      TEXT,
  wireguard_peer_index  INTEGER,
  created_at            TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routers_tenant     ON routers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_routers_vpn_status ON routers (vpn_connected, last_heartbeat_at);

-- ─────────────────────────────────────────────────────────────
-- 7. PACKAGES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id        UUID REFERENCES sites(id)   ON DELETE CASCADE,
  name           VARCHAR(100) NOT NULL,
  speed_mbps     INTEGER,
  download_mbps  INTEGER,
  upload_mbps    INTEGER,
  duration_hrs   INTEGER      NOT NULL,
  duration_label VARCHAR(40),
  price_ugx      NUMERIC(12,2) NOT NULL,
  active         BOOLEAN      DEFAULT TRUE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_tenant ON packages (tenant_id);
CREATE INDEX IF NOT EXISTS idx_packages_site   ON packages (site_id);

-- ─────────────────────────────────────────────────────────────
-- 8. VOUCHERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vouchers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id        UUID REFERENCES sites(id)   ON DELETE CASCADE,
  package_id     UUID REFERENCES packages(id),
  agent_id       UUID,
  code           VARCHAR(30)  NOT NULL UNIQUE,
  status         VARCHAR(20)  DEFAULT 'unused' CHECK (status IN ('unused','active','expired','used')),
  source         VARCHAR(30)  DEFAULT 'admin',
  customer_phone VARCHAR(30),
  activated_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code   ON vouchers (code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_vouchers_tenant ON vouchers (tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 9. SESSIONS (hotspot)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotspot_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  site_id         UUID REFERENCES sites(id),
  router_id       UUID REFERENCES routers(id),
  voucher_id      UUID REFERENCES vouchers(id),
  username        VARCHAR(64) NOT NULL,
  mac_address     VARCHAR(20),
  ip_address      INET,
  nas_ip          INET,
  acct_session_id VARCHAR(64),
  bytes_in        BIGINT DEFAULT 0,
  bytes_out       BIGINT DEFAULT 0,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  terminate_cause VARCHAR(60)
);

CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_username ON hotspot_sessions (username);
CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_tenant   ON hotspot_sessions (tenant_id, started_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 10. PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  site_id                  UUID REFERENCES sites(id),
  voucher_id               UUID REFERENCES vouchers(id),
  amount_ugx               NUMERIC(12,2) NOT NULL,
  method                   VARCHAR(30)  CHECK (method IN ('mtn','airtel','cash','card','stripe')),
  status                   VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  reference                TEXT,
  customer_phone           VARCHAR(30),
  customer_name            VARCHAR(150),
  voucher_code             VARCHAR(30),
  stripe_payment_intent_id TEXT,
  stripe_customer_id       TEXT,
  card_last4               VARCHAR(4),
  card_brand               VARCHAR(20),
  created_at               TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_site   ON payments (site_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 11. AGENTS (POS / field sales)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name           VARCHAR(120) NOT NULL,
  phone          VARCHAR(30)  NOT NULL UNIQUE,
  pin_hash       TEXT         NOT NULL,
  site_id        UUID REFERENCES sites(id),
  commission_pct NUMERIC(5,2) DEFAULT 5.00,
  wallet_balance NUMERIC(12,2) DEFAULT 0.00,
  status         VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','suspended')),
  created_at     TIMESTAMPTZ  DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_phone  ON agents (phone);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents (tenant_id);

CREATE TABLE IF NOT EXISTS pos_sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES agents(id),
  site_id        UUID NOT NULL REFERENCES sites(id),
  package_id     UUID NOT NULL REFERENCES packages(id),
  customer_phone VARCHAR(30)  NOT NULL,
  voucher_id     UUID REFERENCES vouchers(id),
  amount_ugx     NUMERIC(12,2) NOT NULL,
  commission_ugx NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30)  DEFAULT 'cash' CHECK (payment_method IN ('cash','mtn','airtel','card')),
  sms_sent       BOOLEAN      DEFAULT FALSE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pos_sales_agent ON pos_sales (agent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_wallet_txns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  type          VARCHAR(20)  CHECK (type IN ('commission','withdrawal','adjustment')),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  balance_after NUMERIC(12,2) NOT NULL,
  reference     TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 12. PPPoE BILLING
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pppoe_plans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name                VARCHAR(80)  NOT NULL,
  download_mbps       INTEGER      NOT NULL,
  upload_mbps         INTEGER      NOT NULL,
  price_ugx           NUMERIC(12,2) NOT NULL,
  billing_cycle       VARCHAR(20)  DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly','monthly','quarterly')),
  burst_download_mbps INTEGER,
  burst_upload_mbps   INTEGER,
  data_cap_gb         INTEGER,
  active              BOOLEAN      DEFAULT TRUE,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pppoe_subscribers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID REFERENCES tenants(id) ON DELETE CASCADE,
  site_id           UUID REFERENCES sites(id),
  router_id         UUID REFERENCES routers(id),
  full_name         VARCHAR(150) NOT NULL,
  phone             VARCHAR(30)  NOT NULL,
  email             VARCHAR(150),
  username          VARCHAR(80)  NOT NULL UNIQUE,
  password_hash     TEXT         NOT NULL,
  plan_id           UUID REFERENCES pppoe_plans(id),
  ip_address        INET,
  status            VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  next_billing_date DATE,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pppoe_username ON pppoe_subscribers (username);
CREATE INDEX IF NOT EXISTS idx_pppoe_status   ON pppoe_subscribers (status, next_billing_date);

CREATE TABLE IF NOT EXISTS pppoe_invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES pppoe_subscribers(id),
  plan_id       UUID NOT NULL REFERENCES pppoe_plans(id),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  due_date      DATE          NOT NULL,
  paid_at       TIMESTAMPTZ,
  payment_id    UUID REFERENCES payments(id),
  status        VARCHAR(20)   DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
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

-- ─────────────────────────────────────────────────────────────
-- 13. FREERADIUS TABLES (standard schema)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS radcheck (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64)  NOT NULL DEFAULT '',
  attribute VARCHAR(64)  NOT NULL DEFAULT '',
  op        CHAR(2)      NOT NULL DEFAULT ':=',
  value     VARCHAR(253) NOT NULL DEFAULT '',
  CONSTRAINT radcheck_username_attribute UNIQUE (username, attribute)
);
CREATE INDEX IF NOT EXISTS idx_radcheck_username ON radcheck (username);

CREATE TABLE IF NOT EXISTS radreply (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64)  NOT NULL DEFAULT '',
  attribute VARCHAR(64)  NOT NULL DEFAULT '',
  op        CHAR(2)      NOT NULL DEFAULT '=',
  value     VARCHAR(253) NOT NULL DEFAULT '',
  CONSTRAINT radreply_username_attribute UNIQUE (username, attribute)
);
CREATE INDEX IF NOT EXISTS idx_radreply_username ON radreply (username);

CREATE TABLE IF NOT EXISTS radgroupcheck (
  id        SERIAL PRIMARY KEY,
  groupname VARCHAR(64)  NOT NULL DEFAULT '',
  attribute VARCHAR(64)  NOT NULL DEFAULT '',
  op        CHAR(2)      NOT NULL DEFAULT ':=',
  value     VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radgroupreply (
  id        SERIAL PRIMARY KEY,
  groupname VARCHAR(64)  NOT NULL DEFAULT '',
  attribute VARCHAR(64)  NOT NULL DEFAULT '',
  op        CHAR(2)      NOT NULL DEFAULT '=',
  value     VARCHAR(253) NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS radusergroup (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64) NOT NULL DEFAULT '',
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  priority  INTEGER     NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_radusergroup_username ON radusergroup (username);

CREATE TABLE IF NOT EXISTS radacct (
  radacctid          BIGSERIAL    PRIMARY KEY,
  acctsessionid      VARCHAR(64)  NOT NULL DEFAULT '',
  acctuniqueid       VARCHAR(32)  NOT NULL DEFAULT '' UNIQUE,
  username           VARCHAR(64)  NOT NULL DEFAULT '',
  realm              VARCHAR(64)  DEFAULT '',
  nasipaddress       INET         NOT NULL,
  nasportid          VARCHAR(15)  DEFAULT NULL,
  nasporttype        VARCHAR(32)  DEFAULT NULL,
  acctstarttime      TIMESTAMPTZ  DEFAULT NULL,
  acctstoptime       TIMESTAMPTZ  DEFAULT NULL,
  acctsessiontime    BIGINT       DEFAULT NULL,
  acctauthentic      VARCHAR(32)  DEFAULT NULL,
  connectinfo_start  VARCHAR(50)  DEFAULT NULL,
  connectinfo_stop   VARCHAR(50)  DEFAULT NULL,
  acctinputoctets    BIGINT       DEFAULT 0,
  acctoutputoctets   BIGINT       DEFAULT 0,
  calledstationid    VARCHAR(50)  NOT NULL DEFAULT '',
  callingstationid   VARCHAR(50)  NOT NULL DEFAULT '',
  acctterminatecause VARCHAR(32)  NOT NULL DEFAULT '',
  servicetype        VARCHAR(32)  DEFAULT NULL,
  framedprotocol     VARCHAR(32)  DEFAULT NULL,
  framedipaddress    INET         DEFAULT NULL,
  acctstartdelay     INTEGER      DEFAULT NULL,
  acctstopdelay      INTEGER      DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_radacct_username  ON radacct (username);
CREATE INDEX IF NOT EXISTS idx_radacct_nasip     ON radacct (nasipaddress);
CREATE INDEX IF NOT EXISTS idx_radacct_start     ON radacct (acctstarttime);
CREATE INDEX IF NOT EXISTS idx_radacct_stop      ON radacct (acctstoptime);
CREATE INDEX IF NOT EXISTS idx_radacct_sessionid ON radacct (acctsessionid);

CREATE TABLE IF NOT EXISTS nas (
  id          SERIAL       PRIMARY KEY,
  nasname     VARCHAR(128) NOT NULL,
  shortname   VARCHAR(32),
  type        VARCHAR(30)  DEFAULT 'other',
  ports       INTEGER,
  secret      VARCHAR(60)  NOT NULL,
  server      VARCHAR(64),
  community   VARCHAR(50),
  description VARCHAR(200) DEFAULT 'MikroTik hotspot router'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nas_nasname ON nas (nasname);

CREATE TABLE IF NOT EXISTS radpostauth (
  id           BIGSERIAL    PRIMARY KEY,
  username     VARCHAR(64)  NOT NULL,
  pass         VARCHAR(64)  NOT NULL DEFAULT '',
  reply        VARCHAR(32)  NOT NULL DEFAULT '',
  nasipaddress VARCHAR(15)  NOT NULL DEFAULT '',
  authdate     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 14. PLATFORM SETTINGS & TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key   VARCHAR(80) PRIMARY KEY,
  value TEXT        NOT NULL
);

INSERT INTO platform_settings (key, value) VALUES
  ('icube_server_ip',          'web.icubeug.net'),
  ('icube_vpn_server',         'vpn.icube.co.ug'),
  ('icube_radius_ip',          '10.99.0.1'),
  ('icube_portal_domain',      'web.icubeug.net'),
  ('icube_vpn_ipsec_secret',   'icube-ipsec-2024'),
  ('momo_platform_fee_pct',    '3'),
  ('voucher_platform_fee_pct', '2')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS platform_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id),
  payment_id   UUID REFERENCES payments(id),
  type         VARCHAR(30),
  source       VARCHAR(30),
  gross_amount NUMERIC(12,2),
  fee_pct      NUMERIC(5,2),
  fee_amount   NUMERIC(12,2),
  net_amount   NUMERIC(12,2),
  transaction_id VARCHAR(80),
  operation    VARCHAR(60),
  note         TEXT,
  amount       NUMERIC(12,2),
  balance_after NUMERIC(12,2),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_txns_tenant ON platform_transactions (tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 15. SUPPORT NOTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  author_id  UUID REFERENCES superadmin_users(id),
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 16. AUDIT LOGS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID REFERENCES tenants(id),
  actor_id    UUID,
  actor_type  VARCHAR(20),
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60),
  entity_id   UUID,
  payload     JSONB       DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor       ON audit_logs (actor_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 17. SUPPLEMENTARY TABLES
-- ─────────────────────────────────────────────────────────────

-- Router setup wizard configs
CREATE TABLE IF NOT EXISTS router_setup_configs (
  router_id           UUID PRIMARY KEY REFERENCES routers(id) ON DELETE CASCADE,
  wan_interface       VARCHAR(40)  DEFAULT 'ether1',
  lan_interface       VARCHAR(40)  DEFAULT 'ether2',
  hotspot_network     VARCHAR(40)  DEFAULT '192.168.88.0/24',
  dns_servers         VARCHAR(100) DEFAULT '8.8.8.8,8.8.4.4',
  generated_script    TEXT,
  setup_completed_at  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

-- Router time-series metrics
CREATE TABLE IF NOT EXISTS router_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id       UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id),
  connected_users INTEGER      DEFAULT 0,
  cpu_load        NUMERIC(5,2) DEFAULT 0,
  memory_used_mb  INTEGER      DEFAULT 0,
  rx_bytes_sec    BIGINT       DEFAULT 0,
  tx_bytes_sec    BIGINT       DEFAULT 0,
  uptime_seconds  BIGINT       DEFAULT 0,
  recorded_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_metrics_router ON router_metrics (router_id, recorded_at DESC);

-- Portal mobile money payment requests
CREATE TABLE IF NOT EXISTS portal_payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id),
  site_id      UUID REFERENCES sites(id),
  package_id   UUID REFERENCES packages(id),
  phone        VARCHAR(30)  NOT NULL,
  mac_address  VARCHAR(20),
  amount_ugx   NUMERIC(12,2) NOT NULL,
  reference    VARCHAR(80)  NOT NULL UNIQUE,
  provider     VARCHAR(20)  CHECK (provider IN ('mtn','airtel')),
  status       VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','expired')),
  voucher_id   UUID REFERENCES vouchers(id),
  voucher_code VARCHAR(30),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_payments_ref ON portal_payments (reference);

-- Remote SSH sessions
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

-- ─────────────────────────────────────────────────────────────
-- 18. ROW-LEVEL SECURITY (enable on multi-tenant tables)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE sites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE routers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
