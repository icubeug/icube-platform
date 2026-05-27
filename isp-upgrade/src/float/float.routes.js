// src/float/float.routes.js
const express = require('express');
const router  = express.Router();

function paginate(req) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  return { page, per_page, offset: (page - 1) * per_page };
}

// GET /api/v1/float — agent float accounts with balances
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  try {
    const rows = await db.query(`
      SELECT a.id, a.name, a.phone, a.status,
             COALESCE(fa.balance, 0) AS balance,
             COALESCE(fa.use_float, false) AS use_float,
             fa.id AS float_account_id
      FROM agents a
      LEFT JOIN float_accounts fa ON fa.agent_id = a.id
      WHERE a.tenant_id = $1
      ORDER BY a.name
      LIMIT $2 OFFSET $3
    `, [tid, per_page, offset]);

    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM agents WHERE tenant_id = $1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/v1/float/:agent_id — toggle use_float, update balance
router.patch('/:agent_id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { use_float } = req.body;
  try {
    await db.query(`
      INSERT INTO float_accounts (tenant_id, agent_id, use_float)
      VALUES ($1, $2, $3)
      ON CONFLICT (agent_id) DO UPDATE SET use_float = EXCLUDED.use_float
    `, [tid, req.params.agent_id, use_float]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/float/purchases
router.get('/purchases', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  try {
    const rows = await db.query(`
      SELECT fp.*, a.name AS agent_name, ad.name AS seller_name
      FROM float_purchases fp
      LEFT JOIN agents a ON a.id = fp.agent_id
      LEFT JOIN admins ad ON ad.id = fp.seller_id
      WHERE fp.tenant_id = $1
      ORDER BY fp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tid, per_page, offset]);

    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM float_purchases WHERE tenant_id = $1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/float/transactions
router.get('/transactions', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { agent_id, operation } = req.query;
  try {
    const cond = ['ft.tenant_id = $1'];
    const params = [tid];
    if (agent_id)  { cond.push(`ft.agent_id = $${params.length+1}`);  params.push(agent_id); }
    if (operation) { cond.push(`ft.operation = $${params.length+1}`); params.push(operation); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT ft.*, a.name AS agent_name
      FROM float_transactions ft
      LEFT JOIN agents a ON a.id = ft.agent_id
      WHERE ${cond.join(' AND ')}
      ORDER BY ft.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM float_transactions ft WHERE ${cond.join(' AND ')}`,
      countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
