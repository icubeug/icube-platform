// src/sales/sales.routes.js
const express = require('express');
const router  = express.Router();

function paginate(req) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  return { page, per_page, offset: (page - 1) * per_page };
}

// GET /api/v1/sales — all sales
router.get('/', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { search, package_id, agent_id, from, to } = req.query;
  try {
    const cond   = ['v.tenant_id = $1', 'v.deleted_at IS NULL'];
    const params = [tid];
    if (search) {
      cond.push(`v.code ILIKE $${params.length+1}`);
      params.push(`%${search}%`);
    }
    if (package_id) { cond.push(`v.package_id = $${params.length+1}`); params.push(package_id); }
    if (from) { cond.push(`v.created_at >= $${params.length+1}`); params.push(from); }
    if (to)   { cond.push(`v.created_at <= $${params.length+1}`); params.push(to); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT
        v.id, v.code, v.status, v.use_case, v.note, v.created_at, v.first_login_at, v.expires_at,
        p.name AS package_name,
        pay.customer_phone, pay.customer_name, pay.method,
        COALESCE(v.use_case, 'admin_sale') AS channel
      FROM vouchers v
      LEFT JOIN packages p  ON p.id  = v.package_id
      LEFT JOIN payments pay ON pay.voucher_id = v.id AND pay.status = 'completed'
      WHERE ${cond.join(' AND ')}
      ORDER BY v.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM vouchers v WHERE ${cond.join(' AND ')}`, countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/sales/trash — soft-deleted sales
router.get('/trash', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  try {
    const rows = await db.query(`
      SELECT
        v.id, v.code, v.status, v.use_case, v.deleted_at, v.created_at,
        p.name AS package_name,
        pay.customer_phone, pay.customer_name, pay.method
      FROM vouchers v
      LEFT JOIN packages p   ON p.id  = v.package_id
      LEFT JOIN payments pay ON pay.voucher_id = v.id AND pay.status = 'completed'
      WHERE v.tenant_id = $1 AND v.deleted_at IS NOT NULL
      ORDER BY v.deleted_at DESC
      LIMIT $2 OFFSET $3
    `, [tid, per_page, offset]);

    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM vouchers WHERE tenant_id=$1 AND deleted_at IS NOT NULL`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/v1/sales/:id — soft delete (move to trash)
router.delete('/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    await db.query(
      `UPDATE vouchers SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, tid]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/sales/trash/empty
router.post('/trash/empty', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const deleted = await db.query(
      `DELETE FROM vouchers WHERE tenant_id = $1 AND deleted_at IS NOT NULL RETURNING id`, [tid]
    );
    res.json({ deleted: deleted.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
