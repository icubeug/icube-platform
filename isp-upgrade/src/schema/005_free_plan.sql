-- =============================================================
-- Migration 005 — Free plan + cancelled status
-- Run on existing production databases
-- =============================================================

-- Drop old plan CHECK constraint and replace with one that includes 'free'
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('free','starter','growth','pro','enterprise'));

-- Drop old status CHECK constraint and add 'cancelled'
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
  CHECK (status IN ('active','suspended','trial','cancelled'));

-- Update default plan for new signups
ALTER TABLE tenants ALTER COLUMN plan SET DEFAULT 'free';

-- Add admins.phone if not already present (server sync)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash_bcrypt TEXT;

-- Add tenants.notes if not already present
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes TEXT;
