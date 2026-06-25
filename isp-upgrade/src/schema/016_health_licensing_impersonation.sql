-- Migration 016: Self-Check Engine, Licensing, Impersonation Audit, Security Incidents

-- ── Health check run history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_check_runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score      NUMERIC(5,2),
  status     VARCHAR(10)  CHECK(status IN ('green','yellow','red')),
  results    JSONB NOT NULL DEFAULT '{}',
  duration_ms INT
);
CREATE INDEX IF NOT EXISTS idx_health_runs_ran_at ON health_check_runs(ran_at DESC);

-- ── Tenant licenses (defaults: 5 sites, 5 routers) ──────────────────────────
CREATE TABLE IF NOT EXISTS tenant_licenses (
  tenant_id    UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  max_sites    INT NOT NULL DEFAULT 5,
  max_routers  INT NOT NULL DEFAULT 5,
  notes        TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_by   UUID
);

-- Seed default licenses for any tenants that don't have one yet
INSERT INTO tenant_licenses (tenant_id, max_sites, max_routers)
SELECT id, 5, 5 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Trigger: auto-create license row when a new tenant is created
CREATE OR REPLACE FUNCTION fn_auto_tenant_license()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO tenant_licenses (tenant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_tenant_license ON tenants;
CREATE TRIGGER trg_tenant_license
  AFTER INSERT ON tenants FOR EACH ROW EXECUTE FUNCTION fn_auto_tenant_license();

-- ── Capacity upgrade requests ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capacity_upgrade_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  resource_type   VARCHAR(20) NOT NULL CHECK(resource_type IN ('sites','routers')),
  current_limit   INT NOT NULL,
  requested_limit INT NOT NULL,
  reason          TEXT,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','approved','rejected')),
  reviewed_by     UUID,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_tenant ON capacity_upgrade_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_upgrade_requests_pending ON capacity_upgrade_requests(status) WHERE status = 'pending';

-- ── Impersonation audit log (append-only — no UPDATE/DELETE grants) ──────────
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id    UUID NOT NULL,
  superadmin_email TEXT NOT NULL,
  tenant_id        UUID REFERENCES tenants(id),
  tenant_slug      TEXT NOT NULL,
  ip_address       INET,
  user_agent       TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  actions          JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_impersonation_sa   ON impersonation_sessions(superadmin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_tenant ON impersonation_sessions(tenant_id, started_at DESC);

-- ── Security incidents ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity    VARCHAR(20) NOT NULL CHECK(severity IN ('critical','high','medium','low')),
  type        VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  tenant_id   UUID REFERENCES tenants(id),
  metadata    JSONB DEFAULT '{}',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incidents_severity  ON security_incidents(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_unresolved ON security_incidents(created_at DESC) WHERE resolved_at IS NULL;

-- ── QoS scores per tenant (snapshot per health run) ─────────────────────────
CREATE TABLE IF NOT EXISTS tenant_qos_scores (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  measured_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auth_success_rate       NUMERIC(5,2),
  network_uptime          NUMERIC(5,2),
  avg_latency_ms          NUMERIC(8,2),
  packet_loss_pct         NUMERIC(5,2),
  open_ticket_count       INT DEFAULT 0,
  overdue_ticket_count    INT DEFAULT 0,
  score                   NUMERIC(5,2),
  router_online_count     INT DEFAULT 0,
  router_total_count      INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_qos_tenant ON tenant_qos_scores(tenant_id, measured_at DESC);
