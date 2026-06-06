ALTER TABLE tenant_branding ADD COLUMN IF NOT EXISTS portal_template VARCHAR(50) DEFAULT 'classic';
ALTER TABLE tenant_branding ADD COLUMN IF NOT EXISTS portal_theme   VARCHAR(20) DEFAULT 'light';
