-- =============================================================
-- Migration 006 — Add missing columns to tenants table
-- Safe to run on any existing database (IF NOT EXISTS guards)
-- =============================================================

-- Core business columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_name    VARCHAR(150);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS password_hash    TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address          TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country          VARCHAR(80) DEFAULT 'Uganda';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes            TEXT;

-- Ensure plan allows 'free' value
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE tenants ADD  CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free','starter','growth','pro','enterprise'));

-- Ensure status allows 'cancelled' value
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD  CONSTRAINT tenants_status_check
  CHECK (status IN ('active','suspended','trial','cancelled'));

-- Default plan for new signups is free
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'free';

-- Admin columns (if missed from earlier migrations)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone                VARCHAR(30);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT;

-- Backfill business_name from name for existing tenants
UPDATE tenants SET business_name = name WHERE business_name IS NULL;
