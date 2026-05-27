// src/multitenant/tenant.routes.js
const express = require('express');
const router = express.Router();

// GET /api/v1/tenants
router.get('/', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT id, name, slug, owner_email, plan, status, created_at FROM tenants ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/tenants
router.post('/', async (req, res) => {
  const { name, slug, owner_email, plan } = req.body;
  if (!name || !slug || !owner_email) {
    return res.status(400).json({ error: 'name, slug, and owner_email required' });
  }
  try {
    const rows = await req.app.locals.db.query(`
      INSERT INTO tenants (name, slug, owner_email, plan)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, slug, owner_email, plan || 'starter']);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already taken' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/tenants/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT * FROM tenants WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Tenant not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
