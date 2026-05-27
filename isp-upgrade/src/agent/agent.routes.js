// src/agent/agent.routes.js
// REST endpoints consumed by the agent's mobile POS web app.
// All routes except /login require a valid agent JWT.

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const {
  authenticateAgent,
  processSale,
  requestWithdrawal,
  getAgentDashboard,
} = require('./agent.service');

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

module.exports = router;
