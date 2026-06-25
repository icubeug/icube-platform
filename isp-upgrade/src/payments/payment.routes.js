// src/payments/payment.routes.js
const express = require('express');
const { requireAdmin } = require('../auth/admin.middleware');
const router = express.Router();

router.use(requireAdmin);

// GET /api/v1/payments?limit=50&offset=0
router.get('/', async (req, res) => {
  const db     = req.app.locals.db;
  const tid    = req.tenant_id;
  const limit  = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const rows = await db.query(`
      SELECT p.*, v.code AS voucher_code, s.name AS site_name
      FROM payments p
      LEFT JOIN vouchers v ON v.id = p.voucher_id
      LEFT JOIN sites    s ON s.id = p.site_id
      WHERE p.tenant_id = $1
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tid, limit, offset]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/payments/:id
router.get('/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  try {
    const [row] = await db.query(
      'SELECT * FROM payments WHERE id = $1 AND tenant_id = $2',
      [req.params.id, tid]
    );
    if (!row) return res.status(404).json({ error: 'Payment not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
