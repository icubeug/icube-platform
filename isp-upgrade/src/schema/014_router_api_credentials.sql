-- Backfill managed RouterOS API credentials for existing MikroTik routers.
-- The setup script creates/updates this user on the router so iCube can manage it.

UPDATE routers
SET api_username = COALESCE(api_username, 'icube-api'),
    api_password = COALESCE(api_password, 'ia-' || encode(gen_random_bytes(18), 'hex')),
    api_port = COALESCE(api_port, 8728)
WHERE brand = 'mikrotik'
  AND (api_username IS NULL OR api_password IS NULL OR api_port IS NULL);
