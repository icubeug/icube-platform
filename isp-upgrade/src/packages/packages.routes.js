// src/packages/packages.routes.js
const express = require('express');
const router  = express.Router();

// GET /api/v1/packages
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 50);
  const offset   = (page - 1) * per_page;
  const { search } = req.query;
  try {
    const cond   = ['p.tenant_id = $1'];
    const params = [tid];
    if (search) {
      cond.push(`p.name ILIKE $${params.length+1}`);
      params.push(`%${search}%`);
    }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT p.*, s.name AS site_name
      FROM packages p
      LEFT JOIN sites s ON s.id = p.site_id
      WHERE ${cond.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM packages p WHERE ${cond.join(' AND ')}`, countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/packages
router.post('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx, data_limit_mb, site_id } = req.body;
  if (!name || !price_ugx || !duration_hrs) return res.status(400).json({ error: 'name, price_ugx, duration_hrs required' });
  try {
    let siteId = site_id;
    if (!siteId) {
      const sites = await db.query(`SELECT id FROM sites WHERE tenant_id=$1 LIMIT 1`, [tid]);
      siteId = sites[0]?.id;
    }
    const [row] = await db.query(`
      INSERT INTO packages (tenant_id, site_id, name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx, data_limit_mb)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `, [tid, siteId, name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx || 0, data_limit_mb]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/v1/packages/:id
router.patch('/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { active, name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx, data_limit_mb } = req.body;
  try {
    const fields = [];
    const vals   = [];
    let i = 1;
    const map = { active, name, price_ugx, duration_hrs, speed_mbps, upload_mbps, agent_commission_ugx, data_limit_mb };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`${k} = $${i++}`); vals.push(v); }
    }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    vals.push(req.params.id, tid);
    const rows = await db.query(
      `UPDATE packages SET ${fields.join(', ')} WHERE id=$${i} AND tenant_id=$${i+1} RETURNING *`, vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Package not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/v1/packages/:id
router.delete('/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    await db.query(`DELETE FROM packages WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
