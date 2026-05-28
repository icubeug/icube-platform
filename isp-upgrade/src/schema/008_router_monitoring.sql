-- 008: Router monitoring, zero-touch onboarding, heartbeats

-- Router new columns
ALTER TABLE routers ADD COLUMN IF NOT EXISTS router_token       UUID DEFAULT gen_random_uuid();
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_port           INTEGER;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS vpn_address        TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS peer_ip            INET;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS subnet_prefix      INTEGER DEFAULT 24;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS subnet_mask        TEXT    DEFAULT '255.255.255.0';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS network_address    TEXT    DEFAULT '192.168.1.0';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS gateway_ip         TEXT    DEFAULT '192.168.1.1';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS dhcp_pool_start    TEXT    DEFAULT '192.168.1.2';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS dhcp_pool_end      TEXT    DEFAULT '192.168.1.254';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS max_users          INTEGER DEFAULT 200;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS recommended_users  INTEGER DEFAULT 150;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS tier_name          TEXT    DEFAULT 'SOHO';
ALTER TABLE routers ADD COLUMN IF NOT EXISTS serial_number      TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS wan_ip             INET;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS active_users       INTEGER DEFAULT 0;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS connected_users    INTEGER DEFAULT 0;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS model_name         TEXT;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS memory_used        INTEGER DEFAULT 0;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS cpu_load           INTEGER DEFAULT 0;
ALTER TABLE routers ADD COLUMN IF NOT EXISTS last_capacity_alert_at TIMESTAMPTZ;

-- Tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_sites INTEGER DEFAULT 5;

-- Unique index on router_token
CREATE UNIQUE INDEX IF NOT EXISTS routers_token_idx ON routers(router_token);

-- Heartbeats table
CREATE TABLE IF NOT EXISTS router_heartbeats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  router_id       UUID REFERENCES routers(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id),
  cpu_load        INTEGER,
  memory_used     INTEGER,
  uptime_seconds  BIGINT,
  active_users    INTEGER,
  connected_users INTEGER,
  wan_ip          INET,
  wan_rx_bytes    BIGINT DEFAULT 0,
  wan_tx_bytes    BIGINT DEFAULT 0,
  temperature     INTEGER,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_heartbeats_router ON router_heartbeats(router_id, recorded_at DESC);

-- Backfill VPN port for existing routers that have none
DO $$
DECLARE
  r RECORD;
  next_port INTEGER;
BEGIN
  SELECT COALESCE(MAX(vpn_port), 51819) + 1 INTO next_port FROM routers;
  FOR r IN SELECT id FROM routers WHERE vpn_port IS NULL ORDER BY created_at ASC LOOP
    UPDATE routers
    SET vpn_port    = next_port,
        vpn_address = 'vpn.icubeug.net:' || next_port
    WHERE id = r.id;
    next_port := next_port + 1;
  END LOOP;
END $$;
