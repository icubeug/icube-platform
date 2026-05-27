// src/disbursements/disbursement.routes.js
const express = require('express');
const router  = express.Router();

function paginate(req) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  return { page, per_page, offset: (page - 1) * per_page };
}

// GET /api/v1/disbursements
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { search, from, to } = req.query;
  try {
    const cond   = ['tenant_id = $1'];
    const params = [tid];
    if (search) {
      cond.push(`(reason ILIKE $${params.length+1} OR transaction_id ILIKE $${params.length+1} OR payee ILIKE $${params.length+1})`);
      params.push(`%${search}%`);
    }
    if (from) { cond.push(`created_at >= $${params.length+1}`); params.push(from); }
    if (to)   { cond.push(`created_at <= $${params.length+1}`); params.push(to); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT * FROM disbursements
      WHERE ${cond.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM disbursements WHERE ${cond.join(' AND ')}`,
      countParams
    );

    const [balRow] = await db.query(
      `SELECT COALESCE(SUM(amount_ugx) FILTER (WHERE status='success'), 0) AS disbursed FROM disbursements WHERE tenant_id = $1`, [tid]
    );

    res.json({ data: rows, total: parseInt(total), page, per_page, total_disbursed: balRow.disbursed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/disbursements
router.post('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { phone, payee, amount_ugx, reason } = req.body;
  if (!phone || !amount_ugx) return res.status(400).json({ error: 'phone and amount_ugx required' });
  try {
    const txn_id = 'DISB-' + Date.now();
    const [row] = await db.query(`
      INSERT INTO disbursements (tenant_id, phone, payee, amount_ugx, transaction_id, reason, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending')
      RETURNING *
    `, [tid, phone, payee, amount_ugx, txn_id, reason]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
