// src/disbursements/disbursement.routes.js
const express = require('express');
const router  = express.Router();
const {
  detectProviderByPhone,
  initiateDisbursement: gatewayDisburse,
  pollDisbursement:     gatewayPoll,
} = require('../gateways/gateway.service');

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

// POST /api/v1/disbursements/:id/send — trigger gateway disbursement for a pending record
router.post('/:id/send', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const [row] = await db.query(
      `SELECT * FROM disbursements WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!row) return res.status(404).json({ error: 'Disbursement not found' });
    if (row.status !== 'pending') return res.status(409).json({ error: `Cannot send disbursement with status '${row.status}'` });

    let { provider } = req.body;
    if (!provider) {
      provider = detectProviderByPhone(row.phone);
      if (!provider) return res.status(400).json({ error: 'Cannot detect provider from phone — pass provider explicitly' });
    }

    const result = await gatewayDisburse({
      provider,
      phone:      row.phone,
      amount_ugx: row.amount_ugx,
      reference:  row.transaction_id,
      reason:     row.reason,
    });

    await db.query(
      `UPDATE disbursements SET status='processing', provider=$1, provider_ref=$2, updated_at=NOW() WHERE id=$3`,
      [provider, result.provider_ref, row.id]
    );

    res.json({ ok: true, provider, provider_ref: result.provider_ref, status: 'processing' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/v1/disbursements/:id/status — poll gateway for disbursement status
router.get('/:id/status', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const [row] = await db.query(
      `SELECT * FROM disbursements WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    if (!row) return res.status(404).json({ error: 'Disbursement not found' });
    if (!row.provider || !row.provider_ref) {
      return res.status(400).json({ error: 'Disbursement has not been sent via gateway yet' });
    }

    const result = await gatewayPoll(row.provider, row.provider_ref);

    if (result.status === 'completed' && row.status !== 'success') {
      await db.query(`UPDATE disbursements SET status='success', updated_at=NOW() WHERE id=$1`, [row.id]);
    } else if (result.status === 'failed' && row.status !== 'failed') {
      await db.query(`UPDATE disbursements SET status='failed', updated_at=NOW() WHERE id=$1`, [row.id]);
    }

    res.json({ id: row.id, provider: row.provider, provider_ref: row.provider_ref, gateway_status: result.status });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
