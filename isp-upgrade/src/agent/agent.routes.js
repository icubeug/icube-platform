// src/agent/agent.routes.js
// Admin routes (requireAdmin) and agent POS routes (requireAgent) share this router.
// Admin routes: GET /, POST /, PATCH /:id — use standard admin JWT.
// Agent routes: /login, /dashboard, /packages, /sale, /withdraw, /sales-history — agent JWT.

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const {
  authenticateAgent,
  processSale,
  requestWithdrawal,
  getAgentDashboard,
} = require('./agent.service');
const { requireAdmin } = require('../auth/admin.middleware');

const AGENT_JWT_SECRET = process.env.AGENT_JWT_SECRET || process.env.JWT_SECRET;

// ── Middleware: agent token guard ─────────────────────────────────────────────
function requireAgent(req, res, next) {
  const token = req.headers.authorization?.slice(7);
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.agent = jwt.verify(token, AGENT_JWT_SECRET);
    req.db    = req.app.locals.db;
    req.redis = req.app.locals.redis;
    next();
  } catch {
    res.status(401).json({ error: 'Token expired' });
  }
}

// ── POST /api/v1/agents/login ─────────────────────────────────────────────────
// Body: { phone, pin }
router.post('/login', async (req, res) => {
  const { phone, pin } = req.body;
  if (!phone || !pin) return res.status(400).json({ error: 'phone and pin required' });

  try {
    const agent = await authenticateAgent(req.app.locals.db, { phone, pin });
    const token = jwt.sign(
      { agent_id: agent.id, tenant_id: agent.tenant_id, role: 'agent' },
      AGENT_JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, agent });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// ── GET /api/v1/agents/dashboard ──────────────────────────────────────────────
router.get('/dashboard', requireAgent, async (req, res) => {
  try {
    const data = await getAgentDashboard(req.db, req.agent.agent_id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/agents/packages ───────────────────────────────────────────────
// Returns packages available at this agent's site
router.get('/packages', requireAgent, async (req, res) => {
  try {
    const packages = await req.db.query(`
      SELECT id, name, price_ugx, duration_label, speed_label, description
      FROM packages
      WHERE active = true
        AND (site_id = $1 OR site_id IS NULL)
        AND tenant_id = $2
      ORDER BY price_ugx ASC
    `, [req.agent.site_id, req.agent.tenant_id]);
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/agents/sale ──────────────────────────────────────────────────
// Body: { package_id, customer_phone, payment_method? }
router.post('/sale', requireAgent, async (req, res) => {
  const { package_id, customer_phone, payment_method = 'cash' } = req.body;
  if (!package_id || !customer_phone) {
    return res.status(400).json({ error: 'package_id and customer_phone required' });
  }

  try {
    const result = await processSale(req.db, req.redis, {
      agent_id: req.agent.agent_id,
      site_id: req.agent.site_id,
      package_id,
      customer_phone,
      payment_method,
      tenant_id: req.agent.tenant_id,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── POST /api/v1/agents/withdraw ──────────────────────────────────────────────
// Body: { amount_ugx, payout_phone }
router.post('/withdraw', requireAgent, async (req, res) => {
  const { amount_ugx, payout_phone } = req.body;
  if (!amount_ugx || !payout_phone) {
    return res.status(400).json({ error: 'amount_ugx and payout_phone required' });
  }

  try {
    const result = await requestWithdrawal(req.db, req.agent.agent_id, amount_ugx, payout_phone);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── GET /api/v1/agents/sales-history ─────────────────────────────────────────
router.get('/sales-history', requireAgent, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  try {
    const rows = await req.db.query(`
      SELECT
        ps.id, ps.customer_phone, ps.amount_ugx, ps.commission_ugx,
        ps.payment_method, ps.sms_sent, ps.created_at,
        p.name AS package_name,
        v.code AS voucher_code
      FROM pos_sales ps
      JOIN packages p ON p.id = ps.package_id
      JOIN vouchers v ON v.id = ps.voucher_id
      WHERE ps.agent_id = $1
      ORDER BY ps.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.agent.agent_id, limit, offset]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin routes (admin JWT required) ────────────────────────────────────────

// GET /api/v1/agents — list all agents for this tenant
router.get('/', requireAdmin, async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const per_page = Math.min(100, parseInt(req.query.per_page) || 20);
  const offset   = (page - 1) * per_page;
  try {
    const rows = await db.query(`
      SELECT a.id, a.name, a.phone, a.status, a.commission_pct,
             a.wallet_balance, a.site_id, a.created_at,
             s.name AS site_name
      FROM agents a
      LEFT JOIN sites s ON s.id = a.site_id
      WHERE a.tenant_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `, [tid, per_page, offset]);
    const [{ total }] = await db.query(
      `SELECT COUNT(*) AS total FROM agents WHERE tenant_id = $1`, [tid]
    );
    res.json({ data: rows, total: parseInt(total), page, per_page });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/agents — create agent (admin)
router.post('/', requireAdmin, async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  const bcrypt = require('bcrypt');
  const { name, phone, pin, site_id, commission_pct = 5 } = req.body;
  if (!name || !phone || !pin) {
    return res.status(400).json({ error: 'name, phone, and pin required' });
  }
  try {
    const pin_hash = await bcrypt.hash(String(pin), 10);
    const [row] = await db.query(`
      INSERT INTO agents (tenant_id, name, phone, pin_hash, site_id, commission_pct)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, name, phone, status, commission_pct, wallet_balance, site_id, created_at
    `, [tid, name, phone, pin_hash, site_id || null, commission_pct]);
    res.status(201).json(row);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone number already registered' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/agents/:id — update agent (admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant_id;
  const { name, phone, site_id, commission_pct, status } = req.body;
  try {
    const [row] = await db.query(`
      UPDATE agents SET
        name           = COALESCE($1, name),
        phone          = COALESCE($2, phone),
        site_id        = COALESCE($3, site_id),
        commission_pct = COALESCE($4, commission_pct),
        status         = COALESCE($5, status),
        updated_at     = NOW()
      WHERE id = $6 AND tenant_id = $7
      RETURNING id, name, phone, status, commission_pct, wallet_balance, site_id, updated_at
    `, [name, phone, site_id, commission_pct, status, req.params.id, tid]);
    if (!row) return res.status(404).json({ error: 'Agent not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
