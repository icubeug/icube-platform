-- =============================================================
-- ISP PLATFORM — BASE SCHEMA
-- Run this FIRST, then upgrade_migration.sql
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Admins ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          VARCHAR(120),
  role          VARCHAR(30) DEFAULT 'admin' CHECK (role IN ('superadmin','admin','viewer')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sites (hotspot locations) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  location      TEXT,
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Routers ────────────────────────────────────────────────────
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

-- ── Packages ───────────────────────────────────────────────────
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

-- ── Vouchers ───────────────────────────────────────────────────
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

-- ── Payments ───────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_vouchers_code   ON vouchers (code);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payments_site   ON payments (site_id, created_at DESC);
