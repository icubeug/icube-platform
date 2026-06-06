// src/multitenant/tenant.routes.js
const express = require('express');
const router = express.Router();

// GET /api/v1/tenants
router.get('/', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT id, name, slug, owner_email, plan, status, created_at FROM tenants WHERE id = $1',
      [req.tenant_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/tenants
router.post('/', async (req, res) => {
  res.status(403).json({ error: 'Tenant creation is only available through registration or superadmin.' });
});

// GET /api/v1/tenants/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT * FROM tenants WHERE id = $1 AND id = $2',
      [req.params.id, req.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
