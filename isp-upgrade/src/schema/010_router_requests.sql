-- 010: Router request table (tenants request routers from iCube support)

CREATE TABLE IF NOT EXISTS router_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name  TEXT,
  tenant_email TEXT,
  router_name  TEXT NOT NULL,
  router_model TEXT,
  site_name    TEXT,
  notes        TEXT,
  status       TEXT DEFAULT 'pending'
                 CHECK (status IN ('pending','in_progress','completed','cancelled')),
  handled_by   UUID REFERENCES superadmin_users(id),
  handled_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_router_requests_tenant  ON router_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_router_requests_status  ON router_requests(status, created_at DESC);
