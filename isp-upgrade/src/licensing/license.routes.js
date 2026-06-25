// src/licensing/license.routes.js
// Tenant-facing: GET /api/v1/license, POST /api/v1/license/upgrade-request
// Superadmin routes live in superadmin.routes.js

const express = require('express');
const { requireAdmin } = require('../auth/admin.middleware');
const {
  getLicense,
  getUsage,
  checkLimit,
  requestUpgrade,
} = require('./license.service');

const router = express.Router();
router.use(requireAdmin);

// GET /api/v1/license — current tenant license + usage
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const [license, usage] = await Promise.all([
      getLicense(db, tid),
      getUsage(db, tid),
    ]);
    const sites_pct   = license.max_sites   > 0 ? Math.round((usage.sites   / license.max_sites)   * 100) : 100;
    const routers_pct = license.max_routers > 0 ? Math.round((usage.routers / license.max_routers) * 100) : 100;
    res.json({
      max_sites:    license.max_sites,
      max_routers:  license.max_routers,
      used_sites:   usage.sites,
      used_routers: usage.routers,
      sites_pct,
      routers_pct,
      sites_warning:   sites_pct   >= 80,
      routers_warning: routers_pct >= 80,
      sites_exceeded:   usage.sites   >= license.max_sites,
      routers_exceeded: usage.routers >= license.max_routers,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/license/upgrade-request
// Body: { resource_type: 'sites'|'routers', requested_limit: number, reason: string }
router.post('/upgrade-request', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  const { resource_type, requested_limit, reason } = req.body;
  if (!resource_type || !requested_limit) {
    return res.status(400).json({ error: 'resource_type and requested_limit required' });
  }
  if (!['sites','routers'].includes(resource_type)) {
    return res.status(400).json({ error: 'resource_type must be sites or routers' });
  }
  if (requested_limit < 1 || requested_limit > 1000) {
    return res.status(400).json({ error: 'requested_limit must be 1–1000' });
  }
  try {
    const req_row = await requestUpgrade(db, tid, { resource_type, requested_limit, reason });
    res.status(201).json(req_row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/license/upgrade-requests — list own requests
router.get('/upgrade-requests', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const rows = await db.query(
      `SELECT * FROM capacity_upgrade_requests WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tid]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
