// src/sites/site.routes.js
const express = require('express');
const router = express.Router();

// GET /api/v1/sites
router.get('/', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(`
      SELECT s.*,
        COUNT(DISTINCT r.id) AS router_count,
        COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'active') AS active_vouchers
      FROM sites s
      LEFT JOIN routers r ON r.site_id = s.id
      LEFT JOIN vouchers v ON v.site_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/sites
router.post('/', async (req, res) => {
  const { name, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const rows = await req.app.locals.db.query(`
      INSERT INTO sites (name, location, tenant_id) VALUES ($1, $2, $3) RETURNING *
    `, [name, location, req.tenant_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/sites/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Site not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/sites/:id
router.patch('/:id', async (req, res) => {
  const { name, location, status } = req.body;
  try {
    const rows = await req.app.locals.db.query(`
      UPDATE sites SET
        name     = COALESCE($1, name),
        location = COALESCE($2, location),
        status   = COALESCE($3, status)
      WHERE id = $4
      RETURNING *
    `, [name, location, status, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Site not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── Packages CRUD (used by /admin/packages page) ──────────────────────────────
