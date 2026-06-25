-- =====================================================================
-- Migration 017: TOTP + password-reset columns for tenant admins
-- =====================================================================

-- 2FA columns on admins (tenant admin users)
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_secret   TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_verified BOOLEAN DEFAULT FALSE;

-- Track forced-reset flag so admin is prompted to change password on next login
ALTER TABLE admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Same flag on superadmin_users (for completeness)
ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;
