// src/users/users.routes.js
const express = require('express');
const router  = express.Router();

function paginate(req) {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  return { page, per_page, offset: (page - 1) * per_page };
}

// GET /api/v1/users/staff
router.get('/staff', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { search, role } = req.query;
  try {
    const cond   = ['tenant_id = $1'];
    const params = [tid];
    if (search) {
      cond.push(`(name ILIKE $${params.length+1} OR email ILIKE $${params.length+1})`);
      params.push(`%${search}%`);
    }
    if (role) { cond.push(`role = $${params.length+1}`); params.push(role); }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT id, name, email, phone, role, site_id, last_login_at, created_at, requires_printer
      FROM admins
      WHERE ${cond.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM admins WHERE ${cond.join(' AND ')}`, countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/users/customers
router.get('/customers', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  const { search } = req.query;
  try {
    const cond   = ['c.tenant_id = $1'];
    const params = [tid];
    if (search) {
      cond.push(`(c.name ILIKE $${params.length+1} OR c.phone ILIKE $${params.length+1} OR c.email ILIKE $${params.length+1})`);
      params.push(`%${search}%`);
    }
    params.push(per_page, offset);

    const rows = await db.query(`
      SELECT c.*, s.name AS site_name,
             (SELECT COUNT(*) FROM vouchers v WHERE v.customer_phone = c.phone AND v.tenant_id = c.tenant_id) AS cards_count
      FROM customers c
      LEFT JOIN sites s ON s.id = c.site_id
      WHERE ${cond.join(' AND ')}
      ORDER BY c.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    const countParams = params.slice(0, params.length - 2);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM customers c WHERE ${cond.join(' AND ')}`, countParams
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/users/roles
router.get('/roles', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { page, per_page, offset } = paginate(req);
  try {
    const rows = await db.query(`
      SELECT * FROM roles WHERE tenant_id = $1 ORDER BY name
      LIMIT $2 OFFSET $3
    `, [tid, per_page, offset]);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM roles WHERE tenant_id = $1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/users/roles
router.post('/roles', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { name, permissions = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const [row] = await db.query(`
      INSERT INTO roles (tenant_id, name, permissions)
      VALUES ($1,$2,$3) RETURNING *
    `, [tid, name, JSON.stringify(permissions)]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/v1/users/roles/:id
router.delete('/roles/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    await db.query(`DELETE FROM roles WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
