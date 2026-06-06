-- =====================================================================
-- iCube Platform — Migration 004: RADIUS tables + WireGuard columns
-- Run order: after full_migration.sql (003)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- FREERADIUS TABLES (standard FreeRADIUS schema for PostgreSQL)
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS radcheck (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op        CHAR(2)     NOT NULL DEFAULT ':=',
  value     VARCHAR(253) NOT NULL DEFAULT '',
  CONSTRAINT radcheck_username_attribute UNIQUE (username, attribute)
);
CREATE INDEX IF NOT EXISTS idx_radcheck_username ON radcheck (username);

CREATE TABLE IF NOT EXISTS radreply (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op        CHAR(2)     NOT NULL DEFAULT '=',
  value     VARCHAR(253) NOT NULL DEFAULT '',
  CONSTRAINT radreply_username_attribute UNIQUE (username, attribute)
);
CREATE INDEX IF NOT EXISTS idx_radreply_username ON radreply (username);

CREATE TABLE IF NOT EXISTS radgroupcheck (
  id        SERIAL PRIMARY KEY,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op        CHAR(2)     NOT NULL DEFAULT ':=',
  value     VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radgroupcheck_groupname ON radgroupcheck (groupname);

CREATE TABLE IF NOT EXISTS radgroupreply (
  id        SERIAL PRIMARY KEY,
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  attribute VARCHAR(64) NOT NULL DEFAULT '',
  op        CHAR(2)     NOT NULL DEFAULT '=',
  value     VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_radgroupreply_groupname ON radgroupreply (groupname);

CREATE TABLE IF NOT EXISTS radusergroup (
  id        SERIAL PRIMARY KEY,
  username  VARCHAR(64) NOT NULL DEFAULT '',
  groupname VARCHAR(64) NOT NULL DEFAULT '',
  priority  INTEGER     NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_radusergroup_username ON radusergroup (username);

CREATE TABLE IF NOT EXISTS radacct (
  radacctid          BIGSERIAL PRIMARY KEY,
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
CREATE INDEX IF NOT EXISTS idx_radacct_username    ON radacct (username);
CREATE INDEX IF NOT EXISTS idx_radacct_nasip       ON radacct (nasipaddress);
CREATE INDEX IF NOT EXISTS idx_radacct_start       ON radacct (acctstarttime);
CREATE INDEX IF NOT EXISTS idx_radacct_stop        ON radacct (acctstoptime);
CREATE INDEX IF NOT EXISTS idx_radacct_sessionid   ON radacct (acctsessionid);

-- NAS table — loaded by FreeRADIUS for dynamic client secrets
CREATE TABLE IF NOT EXISTS nas (
  id          SERIAL PRIMARY KEY,
  nasname     VARCHAR(128) NOT NULL,
  shortname   VARCHAR(32),
  type        VARCHAR(30)  DEFAULT 'other',
  ports        INTEGER,
  secret      VARCHAR(60)  NOT NULL,
  server      VARCHAR(64),
  community   VARCHAR(50),
  description VARCHAR(200) DEFAULT 'MikroTik hotspot router'
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nas_nasname ON nas (nasname);

-- Post-auth log
CREATE TABLE IF NOT EXISTS radpostauth (
  id           BIGSERIAL PRIMARY KEY,
  username     VARCHAR(64)  NOT NULL,
  pass         VARCHAR(64)  NOT NULL DEFAULT '',
  reply        VARCHAR(32)  NOT NULL DEFAULT '',
  nasipaddress VARCHAR(15)  NOT NULL DEFAULT '',
  authdate     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_radpostauth_username ON radpostauth (username);
CREATE INDEX IF NOT EXISTS idx_radpostauth_date     ON radpostauth (authdate);

-- ─────────────────────────────────────────────────────────────────────
-- WIREGUARD COLUMNS on routers table
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE routers ADD COLUMN IF NOT EXISTS wireguard_private_key TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS wireguard_public_key  TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS wireguard_peer_ip     INET;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS wireguard_config      TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS wireguard_peer_index  INTEGER;

-- ─────────────────────────────────────────────────────────────────────
-- EXISTING ROUTERS COLUMNS (guard against missing from earlier versions)
-- ─────────────────────────────────────────────────────────────────────

ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_username       VARCHAR(80);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_password       TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_connected      BOOLEAN DEFAULT FALSE;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_ip             INET;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret      VARCHAR(80);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_heartbeat_at  TIMESTAMPTZ;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS setup_completed    BOOLEAN DEFAULT FALSE;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS ssh_port           INTEGER DEFAULT 22;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS board_name         VARCHAR(80);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS firmware_version   VARCHAR(40);
ALTER TABLE routers ADD COLUMN IF NOT EXISTS uptime_seconds     BIGINT DEFAULT 0;

-- Router metrics table (time-series)
CREATE TABLE IF NOT EXISTS router_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id       UUID NOT NULL REFERENCES routers(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id),
  connected_users INTEGER DEFAULT 0,
  cpu_load        NUMERIC(5,2) DEFAULT 0,
  memory_used_mb  INTEGER DEFAULT 0,
  rx_bytes_sec    BIGINT DEFAULT 0,
  tx_bytes_sec    BIGINT DEFAULT 0,
  uptime_seconds  BIGINT DEFAULT 0,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_router_metrics_router ON router_metrics (router_id, recorded_at DESC);

-- Router setup configs
CREATE TABLE IF NOT EXISTS router_setup_configs (
  router_id         UUID PRIMARY KEY REFERENCES routers(id) ON DELETE CASCADE,
  wan_interface     VARCHAR(40) DEFAULT 'ether1',
  lan_interface     VARCHAR(40) DEFAULT 'ether2',
  hotspot_network   VARCHAR(40) DEFAULT '192.168.88.0/24',
  dns_servers       VARCHAR(100) DEFAULT '8.8.8.8,8.8.4.4',
  generated_script  TEXT,
  setup_completed_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Platform settings (key-value store for platform-level config)
CREATE TABLE IF NOT EXISTS platform_settings (
  key   VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO platform_settings (key, value) VALUES
  ('icube_server_ip',       'web.icubeug.net'),
  ('icube_vpn_server',      'vpn.icube.co.ug'),
  ('icube_radius_ip',       '10.99.0.1'),
  ('icube_portal_domain',   'web.icubeug.net'),
  ('icube_vpn_ipsec_secret','icube-ipsec-2024'),
  ('momo_platform_fee_pct', '3'),
  ('voucher_platform_fee_pct','2')
ON CONFLICT (key) DO NOTHING;

-- Admins additional columns
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'admin'
  CHECK (role IN ('superadmin','admin','viewer'));
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS site_id UUID;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS requires_printer BOOLEAN DEFAULT FALSE;

-- Tenants additional columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name  VARCHAR(150);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);

-- Packages additional columns (hotspot packages)
ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_label VARCHAR(40);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS download_mbps  INTEGER;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS upload_mbps    INTEGER;

-- Voucher additional columns
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS agent_id UUID;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS source   VARCHAR(30) DEFAULT 'admin';

-- Payment additional columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS voucher_code  VARCHAR(30);

-- Hotspot sessions (portal login sessions, maps to radacct)
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
CREATE INDEX IF NOT EXISTS idx_hotspot_sessions_tenant  ON hotspot_sessions (tenant_id, started_at DESC);

-- Portal payment requests (mobile money initiated from captive portal)
CREATE TABLE IF NOT EXISTS portal_payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id),
  site_id       UUID REFERENCES sites(id),
  package_id    UUID REFERENCES packages(id),
  phone         VARCHAR(20) NOT NULL,
  mac_address   VARCHAR(20),
  amount_ugx    NUMERIC(12,2) NOT NULL,
  reference     VARCHAR(80) NOT NULL UNIQUE,
  provider      VARCHAR(20) CHECK (provider IN ('mtn','airtel')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','expired')),
  voucher_id    UUID REFERENCES vouchers(id),
  voucher_code  VARCHAR(30),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_payments_ref ON portal_payments (reference);
CREATE INDEX IF NOT EXISTS idx_portal_payments_mac ON portal_payments (mac_address);

-- ─────────────────────────────────────────────────────────────────────
-- Platform transaction tracking (fee deductions)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  payment_id      UUID REFERENCES payments(id),
  type            VARCHAR(30),
  source          VARCHAR(30),
  gross_amount    NUMERIC(12,2),
  fee_pct         NUMERIC(5,2),
  fee_amount      NUMERIC(12,2),
  net_amount      NUMERIC(12,2),
  transaction_id  VARCHAR(80),
  operation       VARCHAR(60),
  note            TEXT,
  amount          NUMERIC(12,2),
  balance_after   NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
