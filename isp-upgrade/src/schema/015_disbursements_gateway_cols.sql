-- Migration 015: add gateway tracking columns to disbursements
-- Also adds 'processing' to status check (set when gateway send is initiated).

ALTER TABLE disbursements
  ADD COLUMN IF NOT EXISTS provider     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS provider_ref TEXT,
  ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE disbursements DROP CONSTRAINT IF EXISTS disbursements_status_check;
ALTER TABLE disbursements ADD CONSTRAINT disbursements_status_check
  CHECK (status IN ('pending', 'processing', 'success', 'failed'));
