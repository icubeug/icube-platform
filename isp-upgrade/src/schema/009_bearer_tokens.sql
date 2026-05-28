-- 009: ZTP bearer tokens + install tokens + tenant API tokens

ALTER TABLE routers ADD COLUMN IF NOT EXISTS bearer_token      TEXT UNIQUE;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS install_token     TEXT UNIQUE;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS install_token_used BOOLEAN DEFAULT false;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS ros_version       TEXT;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE;

-- Backfill bearer_token for existing routers
UPDATE routers
SET bearer_token  = 'icube_' || encode(gen_random_bytes(32), 'hex'),
    install_token = encode(gen_random_bytes(32), 'hex')
WHERE bearer_token IS NULL;

-- Backfill api_token for existing tenants
UPDATE tenants
SET api_token = 'icube_' || encode(gen_random_bytes(32), 'hex')
WHERE api_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS routers_bearer_token_idx  ON routers(bearer_token);
CREATE UNIQUE INDEX IF NOT EXISTS routers_install_token_idx ON routers(install_token);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_api_token_idx     ON tenants(api_token);
