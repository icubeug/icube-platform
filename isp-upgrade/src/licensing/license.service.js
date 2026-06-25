// src/licensing/license.service.js
// Tenant license enforcement — default 5 sites / 5 routers.
// All functions take a db handle and tenant_id.

const DEFAULT_MAX_SITES   = 5;
const DEFAULT_MAX_ROUTERS = 5;

async function getLicense(db, tenant_id) {
  const rows = await db.query(
    `SELECT * FROM tenant_licenses WHERE tenant_id = $1`, [tenant_id]
  );
  if (rows.length) return rows[0];
  // Auto-insert default if missing (handles tenants created before migration 016)
  const [created] = await db.query(
    `INSERT INTO tenant_licenses (tenant_id, max_sites, max_routers)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id
     RETURNING *`,
    [tenant_id, DEFAULT_MAX_SITES, DEFAULT_MAX_ROUTERS]
  );
  return created;
}

async function getUsage(db, tenant_id) {
  const [[sites], [routers]] = await Promise.all([
    db.query(`SELECT COUNT(*)::int AS count FROM sites   WHERE tenant_id = $1`, [tenant_id]),
    db.query(`SELECT COUNT(*)::int AS count FROM routers WHERE tenant_id = $1`, [tenant_id]),
  ]);
  return { sites: sites.count, routers: routers.count };
}

async function checkLimit(db, tenant_id, resource) {
  const [license, usage] = await Promise.all([
    getLicense(db, tenant_id),
    getUsage(db, tenant_id),
  ]);
  const max     = resource === 'sites' ? license.max_sites   : license.max_routers;
  const current = resource === 'sites' ? usage.sites         : usage.routers;
  const pct     = max > 0 ? Math.round((current / max) * 100) : 100;
  return {
    resource,
    current,
    max,
    pct_used: pct,
    at_limit:      current >= max,
    approaching:   pct >= 80 && current < max,
  };
}

async function assertUnderLimit(db, tenant_id, resource) {
  const check = await checkLimit(db, tenant_id, resource);
  if (check.at_limit) {
    const err = new Error(
      `${resource} limit reached (${check.current}/${check.max}). ` +
      `Request an upgrade from your admin.`
    );
    err.status = 403;
    err.code   = 'LICENSE_LIMIT_EXCEEDED';
    err.check  = check;
    throw err;
  }
  return check;
}

async function setLicense(db, tenant_id, { max_sites, max_routers, notes, updated_by }) {
  const [row] = await db.query(
    `INSERT INTO tenant_licenses (tenant_id, max_sites, max_routers, notes, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (tenant_id) DO UPDATE
       SET max_sites   = EXCLUDED.max_sites,
           max_routers = EXCLUDED.max_routers,
           notes       = EXCLUDED.notes,
           updated_by  = EXCLUDED.updated_by,
           updated_at  = NOW()
     RETURNING *`,
    [tenant_id, max_sites, max_routers, notes, updated_by]
  );
  return row;
}

// ── Capacity upgrade requests ─────────────────────────────────────────────────

async function requestUpgrade(db, tenant_id, { resource_type, requested_limit, reason }) {
  const license = await getLicense(db, tenant_id);
  const current_limit = resource_type === 'sites' ? license.max_sites : license.max_routers;
  const [row] = await db.query(
    `INSERT INTO capacity_upgrade_requests
       (tenant_id, resource_type, current_limit, requested_limit, reason)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [tenant_id, resource_type, current_limit, requested_limit, reason]
  );
  return row;
}

async function reviewUpgrade(db, request_id, { status, review_notes, reviewed_by, db: _db }) {
  const [req] = await db.query(
    `UPDATE capacity_upgrade_requests
     SET status=$1, review_notes=$2, reviewed_by=$3, reviewed_at=NOW()
     WHERE id=$4 AND status='pending'
     RETURNING *`,
    [status, review_notes, reviewed_by, request_id]
  );
  if (!req) throw new Error('Request not found or already reviewed');

  if (status === 'approved') {
    const field = req.resource_type === 'sites' ? 'max_sites' : 'max_routers';
    await db.query(
      `UPDATE tenant_licenses SET ${field}=$1, updated_by=$2, updated_at=NOW() WHERE tenant_id=$3`,
      [req.requested_limit, reviewed_by, req.tenant_id]
    );
  }
  return req;
}

async function getAllUsage(db) {
  const rows = await db.query(`
    SELECT
      t.id,
      t.name,
      t.slug,
      COALESCE(l.max_sites, 5)   AS max_sites,
      COALESCE(l.max_routers, 5) AS max_routers,
      COUNT(DISTINCT s.id)::int  AS used_sites,
      COUNT(DISTINCT r.id)::int  AS used_routers
    FROM tenants t
    LEFT JOIN tenant_licenses l ON l.tenant_id = t.id
    LEFT JOIN sites   s ON s.tenant_id = t.id
    LEFT JOIN routers r ON r.tenant_id = t.id
    GROUP BY t.id, t.name, t.slug, l.max_sites, l.max_routers
    ORDER BY t.name
  `);
  return rows.map(r => ({
    ...r,
    sites_pct:   r.max_sites   > 0 ? Math.round((r.used_sites   / r.max_sites)   * 100) : 100,
    routers_pct: r.max_routers > 0 ? Math.round((r.used_routers / r.max_routers) * 100) : 100,
  }));
}

module.exports = {
  getLicense,
  getUsage,
  checkLimit,
  assertUnderLimit,
  setLicense,
  requestUpgrade,
  reviewUpgrade,
  getAllUsage,
};
