-- =====================================================================
-- Migration 018: Schema sync fixes
-- 1. Add tenant_id to pos_sales and agent_wallet_txns
-- 2. Formalise tenant_billing table (exists in live DB, not in migrations)
-- 3. Add 'orphaned' to routers.status constraint (needed for soft-delete)
-- 4. Fix admins FK to tenants — change NO ACTION → CASCADE
-- 5. Add deleted_at + anonymisation columns to tenants
-- =====================================================================

-- ── 1. tenant_id on pos_sales ─────────────────────────────────────────────────
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Backfill from the site the sale belongs to
UPDATE pos_sales ps
SET    tenant_id = s.tenant_id
FROM   sites s
WHERE  s.id = ps.site_id
AND    ps.tenant_id IS NULL;

-- ── 2. tenant_id on agent_wallet_txns ────────────────────────────────────────
ALTER TABLE agent_wallet_txns ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

UPDATE agent_wallet_txns awt
SET    tenant_id = a.tenant_id
FROM   agents a
WHERE  a.id = awt.agent_id
AND    awt.tenant_id IS NULL;

-- ── 3. tenant_billing (formally document the table) ──────────────────────────
CREATE TABLE IF NOT EXISTS tenant_billing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  amount_usd        NUMERIC(10,2)  NOT NULL,
  period_start      DATE           NOT NULL,
  period_end        DATE           NOT NULL,
  status            VARCHAR(20)    DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  stripe_invoice_id TEXT,
  paid_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tenant_billing_tenant ON tenant_billing (tenant_id, created_at DESC);

-- ── 4. Add 'orphaned' to routers.status ──────────────────────────────────────
ALTER TABLE routers DROP CONSTRAINT IF EXISTS routers_status_check;
ALTER TABLE routers ADD  CONSTRAINT routers_status_check
  CHECK (status IN ('online','offline','unreachable','pending','orphaned'));

-- ── 5. Soft-delete columns on tenants ────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at    TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- ── 6. Fix admins FK: NO ACTION → CASCADE ────────────────────────────────────
-- Drop existing FK, re-add with ON DELETE CASCADE
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_tenant_id_fkey;
ALTER TABLE admins ADD  CONSTRAINT admins_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
