// src/sites/site.routes.js
const express = require('express');
const { requireAdmin } = require('../auth/admin.middleware');
const { requireLicense } = require('../licensing/license.middleware');
const router = express.Router();

router.use(requireAdmin);

// GET /api/v1/sites
router.get('/', async (req, res) => {
  const tid = req.tenant_id;
  try {
    const rows = await req.app.locals.db.query(`
      SELECT s.*,
        COUNT(DISTINCT r.id) AS router_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') AS active_vouchers
      FROM sites s
      LEFT JOIN routers r ON r.site_id = s.id
      LEFT JOIN vouchers v ON v.site_id = s.id
      WHERE s.tenant_id = $1
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `, [tid]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/sites/limit — returns current count + max for this tenant
router.get('/limit', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const [tenant]   = await db.query(`SELECT max_sites FROM tenants WHERE id = $1`, [tid]);
    const [countRow] = await db.query(`SELECT COUNT(*) FROM sites WHERE tenant_id = $1`, [tid]);
    res.json({
      max_sites: tenant?.max_sites ?? 5,
      count:     parseInt(countRow.count, 10),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/sites
router.post('/', requireLicense('sites'), async (req, res) => {
  const { name, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const [tenant]   = await db.query(`SELECT max_sites FROM tenants WHERE id = $1`, [tid]);
    const maxSites   = tenant?.max_sites ?? 5;
    const [countRow] = await db.query(`SELECT COUNT(*) FROM sites WHERE tenant_id = $1`, [tid]);
    const current    = parseInt(countRow.count, 10);

    if (current >= maxSites) {
      return res.status(403).json({
        error:         `You have reached your ${maxSites} site limit. Contact support to add more sites.`,
        limit_reached: true,
        current,
        max:           maxSites,
      });
    }

    const [row] = await db.query(`
      INSERT INTO sites (name, location, tenant_id) VALUES ($1, $2, $3) RETURNING *
    `, [name, location, tid]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/sites/:id
router.get('/:id', async (req, res) => {
  const tid = req.tenant_id;
  try {
    const [row] = await req.app.locals.db.query(
      'SELECT * FROM sites WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (!row) return res.status(404).json({ error: 'Site not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/sites/:id
router.patch('/:id', async (req, res) => {
  const { name, location, status } = req.body;
  const tid = req.tenant_id;
  try {
    const [row] = await req.app.locals.db.query(`
      UPDATE sites SET
        name     = COALESCE($1, name),
        location = COALESCE($2, location),
        status   = COALESCE($3, status)
      WHERE id = $4 AND tenant_id = $5
      RETURNING *
    `, [name, location, status, req.params.id, tid]);
    if (!row) return res.status(404).json({ error: 'Site not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
