// src/vouchers/voucher.routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// GET /api/v1/vouchers?status=unused&site_id=...
router.get('/', async (req, res) => {
  const { status, site_id } = req.query;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const conditions = ['1=1'];
    const params = [];
    if (status) { conditions.push(`v.status = $${params.length + 1}`); params.push(status); }
    if (site_id) { conditions.push(`v.site_id = $${params.length + 1}`); params.push(site_id); }
    params.push(limit, offset);

    const rows = await req.app.locals.db.query(`
      SELECT v.*, p.name AS package_name, s.name AS site_name
      FROM vouchers v
      LEFT JOIN packages p ON p.id = v.package_id
      LEFT JOIN sites s ON s.id = v.site_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/vouchers/generate
// Body: { package_id, site_id, count? }
router.post('/generate', async (req, res) => {
  const { package_id, site_id, count = 1 } = req.body;
  if (!package_id || !site_id) return res.status(400).json({ error: 'package_id and site_id required' });

  try {
    const pkg = await req.app.locals.db.query(
      'SELECT * FROM packages WHERE id = $1 AND active = true', [package_id]
    );
    if (!pkg.length) return res.status(404).json({ error: 'Package not found' });

    const generated = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      const code = generateCode();
      const rows = await req.app.locals.db.query(`
        INSERT INTO vouchers (site_id, package_id, code, tenant_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, code, status
      `, [site_id, package_id, code, req.tenant_id]);
      generated.push(rows[0]);
    }
    res.status(201).json({ generated: generated.length, vouchers: generated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/vouchers/redeem
// Body: { code }
router.post('/redeem', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  try {
    const rows = await req.app.locals.db.query(
      `SELECT v.*, p.duration_hrs, p.name AS package_name
       FROM vouchers v JOIN packages p ON p.id = v.package_id
       WHERE UPPER(v.code) = UPPER($1)`, [code]
    );
    if (!rows.length) return res.status(404).json({ error: 'Voucher not found' });
    const v = rows[0];
    if (v.status !== 'unused') return res.status(409).json({ error: `Voucher is ${v.status}` });

    const expires = new Date(Date.now() + v.duration_hrs * 3600 * 1000);
    await req.app.locals.db.query(`
      UPDATE vouchers SET status='active', activated_at=NOW(), expires_at=$1 WHERE id=$2
    `, [expires, v.id]);

    res.json({ message: 'Voucher activated', expires_at: expires, package: v.package_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
