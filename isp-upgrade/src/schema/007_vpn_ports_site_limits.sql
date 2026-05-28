-- 007: unique VPN ports per router + site limits per tenant

ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_port    INTEGER;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_address TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_sites   INTEGER DEFAULT 5;

-- Backfill vpn_port for any existing routers (sequential from 51820)
DO $$
DECLARE
  r RECORD;
  next_port INTEGER := 51820;
BEGIN
  FOR r IN SELECT id FROM routers ORDER BY created_at ASC LOOP
    UPDATE routers
    SET vpn_port    = next_port,
        vpn_address = 'vpn.icubeug.net:' || next_port
    WHERE id = r.id AND vpn_port IS NULL;
    next_port := next_port + 1;
  END LOOP;
END $$;
