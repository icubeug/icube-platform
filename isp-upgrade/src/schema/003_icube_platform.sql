-- =============================================================
-- iCube Platform — Migration 003
-- Superadmin, platform fees, VPN, router setup
-- =============================================================

-- ── Router VPN / setup columns ────────────────────────────────────────────────
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_username       TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_password       TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_ip             INET;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_connected      BOOLEAN DEFAULT FALSE;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS radius_secret      TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_heartbeat_at  TIMESTAMPTZ;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS setup_completed    BOOLEAN DEFAULT FALSE;

-- ── Platform settings (key-value store) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
  ('voucher_platform_fee_pct', '2'),
  ('momo_platform_fee_pct',    '0'),
  ('sms_rate_ugx',             '35'),
  ('platform_name',            'iCube'),
  ('support_email',            'support@icube.co.ug'),
  ('support_phone',            '+256700000000'),
  ('icube_radius_ip',          '10.0.0.1'),
  ('icube_vpn_server',         'vpn.icube.co.ug'),
  ('icube_server_ip',          '41.210.0.1'),
  ('icube_portal_domain',      'portal.icube.co.ug')
ON CONFLICT (key) DO NOTHING;

-- ── Rebuild platform_transactions with proper fee columns ─────────────────────
-- (existing table has different schema — add missing columns)
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS type        TEXT DEFAULT 'platform_fee';
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS source      TEXT;
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2);
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS fee_pct     NUMERIC(5,2);
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS fee_amount  NUMERIC(12,2);
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS net_amount  NUMERIC(12,2);
ALTER TABLE platform_transactions ADD COLUMN IF NOT EXISTS payment_id  UUID;

-- ── Superadmin users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT DEFAULT 'support' CHECK (role IN ('superadmin','support','finance')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Support notes (iCube staff notes on tenants) ─────────────────────────────
CREATE TABLE IF NOT EXISTS support_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES superadmin_users(id) ON DELETE SET NULL,
  note       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Router setup configs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS router_setup_configs (
  router_id        UUID PRIMARY KEY REFERENCES routers(id) ON DELETE CASCADE,
  wan_interface    TEXT DEFAULT 'ether1',
  lan_interface    TEXT DEFAULT 'ether2',
  hotspot_network  TEXT DEFAULT '192.168.88.0/24',
  dns_servers      TEXT DEFAULT '8.8.8.8,8.8.4.4',
  generated_script TEXT,
  setup_completed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tenant onboarding: add missing columns to admins ──────────────────────────
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial' CHECK (status IN ('trial','active','suspended','cancelled'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT;

-- ── Seed superadmin user (password: icube-admin-2026) ─────────────────────────
-- bcrypt hash of 'icube-admin-2026'
INSERT INTO superadmin_users (name, email, password_hash, role)
VALUES (
  'iCube Admin',
  'admin@icube.co.ug',
  '$2b$10$tj2X96z9tDbGlt/yxP0iROxQKhMWgMHhCSTbduEkru96DB.MWYUyO',
  'superadmin'
) ON CONFLICT (email) DO NOTHING;

-- ── Generate VPN creds for existing routers ───────────────────────────────────
UPDATE routers SET
  vpn_username  = 'router-' || SUBSTRING(id::text, 1, 8),
  vpn_password  = MD5(id::text || 'icube-vpn-salt') || SUBSTRING(MD5(RANDOM()::text), 1, 8),
  radius_secret = MD5(id::text || 'icube-radius-salt-' || created_at::text)
WHERE vpn_username IS NULL;

-- ── Fix tenant status for existing dev tenant ─────────────────────────────────
UPDATE tenants SET status = 'active', owner_name = 'Dev Admin', owner_phone = '+256700000000'
WHERE id = 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3' AND status IS NULL;
