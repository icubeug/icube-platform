// src/multitenant/tenant.middleware.js
// Resolves the current tenant from subdomain or custom domain,
// then sets app.current_tenant_id for PostgreSQL RLS and injects
// tenant branding into req.tenant for the response layer.

async function resolveTenant(req, res, next) {
  const db = req.app.locals.db;
  const redis = req.app.locals.redis;

  // 1. Determine tenant identifier
  //    Priority: X-Tenant-ID header (API clients) > subdomain > custom domain
  let tenant = null;

  if (req.headers['x-tenant-id']) {
    tenant = await getTenantById(db, redis, req.headers['x-tenant-id']);
  } else {
    const host = req.hostname; // e.g. "acme.yourplatform.com" or "isp.acme.co.ug"
    const subdomain = host.split('.')[0];

    // Try custom domain first, then slug subdomain
    tenant = await getTenantByDomain(db, redis, host)
          || await getTenantBySlug(db, redis, subdomain);
  }

  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }

  if (tenant.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact support.' });
  }

  // 2. Attach to request
  req.tenant = tenant;

  // 3. Set PostgreSQL session variable for RLS
  //    This runs before every query in this request's DB pool connection.
  await db.query(`SET LOCAL app.current_tenant_id = '${tenant.id}'`);

  next();
}

// ── Tenant lookups (Redis-cached, 5min TTL) ───────────────────────────────────

async function getTenantById(db, redis, id) {
  return cachedTenantQuery(db, redis, `tenant:id:${id}`,
    `SELECT t.*, tb.logo_url, tb.primary_color, tb.secondary_color,
            tb.company_name, tb.support_phone, tb.custom_domain, tb.favicon_url
     FROM tenants t
     LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
     WHERE t.id = $1`, [id]
  );
}

async function getTenantBySlug(db, redis, slug) {
  return cachedTenantQuery(db, redis, `tenant:slug:${slug}`,
    `SELECT t.*, tb.logo_url, tb.primary_color, tb.secondary_color,
            tb.company_name, tb.support_phone, tb.custom_domain, tb.favicon_url
     FROM tenants t
     LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
     WHERE t.slug = $1`, [slug]
  );
}

async function getTenantByDomain(db, redis, domain) {
  return cachedTenantQuery(db, redis, `tenant:domain:${domain}`,
    `SELECT t.*, tb.logo_url, tb.primary_color, tb.secondary_color,
            tb.company_name, tb.support_phone, tb.custom_domain, tb.favicon_url
     FROM tenants t
     LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
     WHERE tb.custom_domain = $1`, [domain]
  );
}

async function cachedTenantQuery(db, redis, cacheKey, sql, params) {
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const rows = await db.query(sql, params);
  if (!rows.length) return null;

  const tenant = rows[0];
  try { await redis.setex(cacheKey, 300, JSON.stringify(tenant)); } catch {}
  return tenant;
}

// ── Tenant creation ───────────────────────────────────────────────────────────

async function createTenant(db, {
  name, slug, owner_email, plan = 'starter',
  branding = {},
}) {
  // Check slug uniqueness
  const existing = await db.query(`SELECT id FROM tenants WHERE slug = $1`, [slug]);
  if (existing.length) throw new Error(`Slug "${slug}" is already taken`);

  await db.query('BEGIN');
  try {
    const tenantRows = await db.query(`
      INSERT INTO tenants (name, slug, owner_email, plan, trial_ends_at)
      VALUES ($1,$2,$3,$4, NOW() + INTERVAL '14 days')
      RETURNING *
    `, [name, slug, owner_email, plan]);

    const tenant = tenantRows[0];

    await db.query(`
      INSERT INTO tenant_branding
        (tenant_id, company_name, primary_color, secondary_color, logo_url, support_email)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [
      tenant.id,
      branding.company_name || name,
      branding.primary_color || '#1D9E75',
      branding.secondary_color || '#378ADD',
      branding.logo_url || null,
      owner_email,
    ]);

    await db.query('COMMIT');
    return tenant;
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

module.exports = { resolveTenant, createTenant, getTenantById };
