// src/vouchers/voucher.routes.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const CHARSETS = {
  digits:          '0123456789',
  uppercase:       'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase:       'abcdefghijklmnopqrstuvwxyz',
  uppercase_alpha: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase_alpha: '0123456789abcdefghijklmnopqrstuvwxyz',
};

function generateCode(format = 'digits', length = 8) {
  const charset = CHARSETS[format] || CHARSETS.digits;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
}

// GET /api/v1/vouchers?status=unused&site_id=...
router.get('/', async (req, res) => {
  const { status, site_id } = req.query;
  const limit  = Math.min(parseInt(req.query.limit) || 200, 1000);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const conditions = ['v.tenant_id = $1'];
    const params = [req.tenant_id];
    if (status)  { conditions.push(`v.status = $${params.length + 1}`);  params.push(status); }
    if (site_id) { conditions.push(`v.site_id = $${params.length + 1}`); params.push(site_id); }
    params.push(limit, offset);

    const rows = await req.app.locals.db.query(`
      SELECT
        v.id, v.code AS username, v.code, p.name AS package_name,
        v.status, v.first_login_at, v.expires_at,
        v.use_case, v.note, v.created_at, v.deleted_at,
        v.site_id, v.package_id, v.tenant_id, v.source, v.agent_id,
        p.duration_hrs, p.price_ugx,
        s.name AS site_name
      FROM vouchers v
      LEFT JOIN packages p ON p.id = v.package_id
      LEFT JOIN sites    s ON s.id = v.site_id
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
// Body: { package_id, site_id?, count?, format?, length?, note?, use_case?, prefix? }
router.post('/generate', async (req, res) => {
  const {
    package_id, site_id = null,
    count = 10, format = 'digits', length = 8,
    note = null, use_case = 'admin_sale', prefix = '',
    expires_at = null,
  } = req.body;
  if (!package_id) return res.status(400).json({ error: 'package_id required' });
  const qty = Math.max(1, Math.min(parseInt(count) || 10, 500));

  try {
    const pkg = await req.app.locals.db.query(
      'SELECT * FROM packages WHERE id = $1 AND tenant_id = $2 AND active = true',
      [package_id, req.tenant_id]
    );
    if (!pkg.length) return res.status(404).json({ error: 'Package not found' });
    if (site_id) {
      const site = await req.app.locals.db.query(
        'SELECT id FROM sites WHERE id = $1 AND tenant_id = $2',
        [site_id, req.tenant_id]
      );
      if (!site.length) return res.status(404).json({ error: 'Site not found' });
    }

    const generated = [];
    for (let i = 0; i < qty; i++) {
      const code = prefix + generateCode(format, length);
      const rows = await req.app.locals.db.query(`
        INSERT INTO vouchers (site_id, package_id, code, tenant_id, note, use_case)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, code, status
      `, [site_id, package_id, code, req.tenant_id, note, use_case]);
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
       WHERE UPPER(v.code) = UPPER($1) AND v.tenant_id = $2`,
      [code, req.tenant_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Voucher not found' });
    const v = rows[0];
    if (v.status !== 'unused') return res.status(409).json({ error: `Voucher is ${v.status}` });

    const expires = new Date(Date.now() + v.duration_hrs * 3600 * 1000);
    await req.app.locals.db.query(`
      UPDATE vouchers SET status='active', activated_at=NOW(), expires_at=$1 WHERE id=$2 AND tenant_id=$3
    `, [expires, v.id, req.tenant_id]);

    res.json({ message: 'Voucher activated', expires_at: expires, package: v.package_name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
