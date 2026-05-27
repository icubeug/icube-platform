// src/billing/billing.routes.js
const express = require('express');
const router  = express.Router();

function paginate(req) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  return { page, per_page, offset: (page - 1) * per_page };
}

// GET /api/v1/billing/history
router.get('/history', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { from, to, status } = req.query;
  try {
    const cond   = ['tenant_id = $1'];
    const params = [tid];
    if (from)   { cond.push(`created_at >= $${params.length+1}`); params.push(from); }
    if (to)     { cond.push(`created_at <= $${params.length+1}`); params.push(to); }
    if (status) { cond.push(`status = $${params.length+1}`);      params.push(status); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT * FROM billing_invoices
      WHERE ${cond.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM billing_invoices WHERE ${cond.join(' AND ')}`, countParams
    );
    const [{ credit }] = await db.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status='paid'), 0) AS credit FROM billing_invoices WHERE tenant_id=$1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page, account_credit: credit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/billing/transactions
router.get('/transactions', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { from, to, operation } = req.query;
  try {
    const cond   = ['tenant_id = $1'];
    const params = [tid];
    if (from)      { cond.push(`created_at >= $${params.length+1}`); params.push(from); }
    if (to)        { cond.push(`created_at <= $${params.length+1}`); params.push(to); }
    if (operation) { cond.push(`operation = $${params.length+1}`);   params.push(operation); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT * FROM platform_transactions
      WHERE ${cond.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM platform_transactions WHERE ${cond.join(' AND ')}`, countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/billing/payments
router.get('/payments', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { from, to, status } = req.query;
  try {
    const cond   = ['tenant_id = $1'];
    const params = [tid];
    if (from)   { cond.push(`created_at >= $${params.length+1}`); params.push(from); }
    if (to)     { cond.push(`created_at <= $${params.length+1}`); params.push(to); }
    if (status) { cond.push(`status = $${params.length+1}`);      params.push(status); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT * FROM billing_invoices
      WHERE ${cond.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM billing_invoices WHERE ${cond.join(' AND ')}`, countParams
    );
    const [{ credit }] = await db.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE status='paid'), 0) AS credit FROM billing_invoices WHERE tenant_id=$1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page, account_credit: credit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
