// src/pppoe/pppoe.routes.js
const express = require('express');
const router = express.Router();
const { runBillingCycle } = require('./pppoe.service');

const db  = () => null; // resolved via req.app.locals.db

// GET /api/v1/pppoe/subscribers
router.get('/subscribers', async (req, res) => {
  const db       = req.app.locals.db;
  const tid      = req.tenant?.id;
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  const offset   = (page - 1) * per_page;
  const { status, search, package_id } = req.query;
  try {
    // Build WHERE clause with proper $N placeholders
    const whereParts = [];
    const params     = [];

    if (tid) {
      params.push(tid);
      whereParts.push('ps.tenant_id = $' + params.length);
    }
    if (status && status !== 'all') {
      params.push(status);
      whereParts.push('ps.status = $' + params.length);
    }
    if (search) {
      params.push('%' + search + '%');
      const n = params.length;
      whereParts.push('(ps.full_name ILIKE $' + n + ' OR ps.username ILIKE $' + n + ' OR ps.phone ILIKE $' + n + ')');
    }
    if (package_id) {
      params.push(package_id);
      whereParts.push('ps.plan_id = $' + params.length);
    }

    const where = whereParts.length ? 'WHERE ' + whereParts.join(' AND ') : '';

    // Count
    const countResult = await db.query(
      'SELECT COUNT(*) AS total FROM pppoe_subscribers ps ' + where,
      params
    );
    const total = parseInt(countResult[0].total);

    // Data
    const dataParams = params.concat([per_page, offset]);
    const lNum = dataParams.length - 1;
    const oNum = dataParams.length;
    const rows = await db.query(`
      SELECT ps.*, pp.name AS plan_name,
             SUBSTRING(ps.id::text, 1, 8) AS account_number
      FROM pppoe_subscribers ps
      LEFT JOIN pppoe_plans pp ON pp.id = ps.plan_id
      ${where}
      ORDER BY ps.created_at DESC
      LIMIT $${lNum} OFFSET $${oNum}
    `, dataParams);

    res.json({ data: rows, total, page, per_page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/pppoe/subscribers
router.post('/subscribers', async (req, res) => {
  const { full_name, phone, email, username, password, plan_id, router_id, site_id } = req.body;
  if (!full_name || !username || !password) {
    return res.status(400).json({ error: 'full_name, username, and password required' });
  }
  try {
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    const rows = await req.app.locals.db.query(`
      INSERT INTO pppoe_subscribers
        (full_name, phone, email, username, password_hash, plan_id, router_id, site_id, tenant_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, full_name, username, status
    `, [full_name, phone, email, username, password_hash, plan_id, router_id, site_id, req.tenant_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/pppoe/plans
router.get('/plans', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT * FROM pppoe_plans WHERE active = true ORDER BY price_ugx ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/pppoe/billing/run  (manual trigger)
router.post('/billing/run', async (req, res) => {
  try {
    const result = await runBillingCycle(req.app.locals.db, req.app.locals.redis);
    res.json({ message: 'Billing cycle complete', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
