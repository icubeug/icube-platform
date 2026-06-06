-- TOTP support for superadmin delete operations
ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS totp_verified BOOLEAN DEFAULT FALSE;

-- Deletion audit log
CREATE TABLE IF NOT EXISTS deletion_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_by     UUID,
  deleted_by_email TEXT,
  entity_type    TEXT,
  entity_id      UUID,
  entity_name    TEXT,
  deleted_at     TIMESTAMPTZ DEFAULT NOW()
);
