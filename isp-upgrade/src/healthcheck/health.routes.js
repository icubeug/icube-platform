// src/healthcheck/health.routes.js
// Public:     GET /api/health              — simple liveness probe (no auth)
// Superadmin: GET /api/superadmin/health   — full mission-control dashboard
// These routes are mounted separately in app.js.

const express = require('express');
const jwt     = require('jsonwebtoken');
const {
  runHealthCheck,
  checkDatabase,
  checkRouterFleet,
  checkInfrastructure,
  computeTenantQoS,
  computeRevenueAtRisk,
} = require('./health.service');
const { getAllUsage } = require('../licensing/license.service');

const SA_SECRET = process.env.SUPERADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret';

// ── Public liveness ───────────────────────────────────────────────────────────
const publicRouter = express.Router();

publicRouter.get('/health', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const db_check = await checkDatabase(db);
    const status   = db_check.ok ? 'ok' : 'degraded';
    res.status(db_check.ok ? 200 : 503).json({ status, timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error' });
  }
});

// ── Superadmin middleware ─────────────────────────────────────────────────────
function requireSuperadmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], SA_SECRET);
    if (!payload.superadmin_id) return res.status(403).json({ error: 'Not a superadmin token' });
    req.superadmin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Superadmin health & mission-control endpoints ─────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireSuperadmin);

// GET /api/superadmin/health/run — trigger a full health check run now
adminRouter.post('/run', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await runHealthCheck(db);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/health/latest — last completed run
adminRouter.get('/latest', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [row] = await db.query(
      `SELECT * FROM health_check_runs ORDER BY ran_at DESC LIMIT 1`
    );
    if (!row) return res.status(404).json({ error: 'No health runs yet — POST /run to start' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/superadmin/health/history?limit=48
adminRouter.get('/history', async (req, res) => {
  const db = req.app.locals.db;
  const limit = Math.min(parseInt(req.query.limit || '48'), 1000);
  try {
    const rows = await db.query(
      `SELECT id, ran_at, score, status, duration_ms FROM health_check_runs
       ORDER BY ran_at DESC LIMIT $1`, [limit]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/superadmin/health/mission-control — full dashboard snapshot
adminRouter.get('/mission-control', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [
      latestRun,
      fleet,
      infra,
      qos,
      revenue,
      licenses,
      pendingUpgrades,
      openIncidents,
      activeImpersonations,
      pendingUpgradeCount,
    ] = await Promise.all([
      db.query(`SELECT * FROM health_check_runs ORDER BY ran_at DESC LIMIT 1`).then(r => r[0] || null),
      checkRouterFleet(db),
      checkInfrastructure(),
      computeTenantQoS(db),
      computeRevenueAtRisk(db),
      getAllUsage(db),
      db.query(`SELECT * FROM capacity_upgrade_requests WHERE status='pending' ORDER BY created_at`),
      db.query(`SELECT * FROM security_incidents WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT 20`),
      db.query(`SELECT * FROM impersonation_sessions WHERE ended_at IS NULL`),
      db.query(`SELECT COUNT(*)::int AS cnt FROM capacity_upgrade_requests WHERE status='pending'`),
    ]);

    // Support team performance
    const support = await db.query(`
      SELECT
        COUNT(*)::int                                                           AS total_open,
        COUNT(*) FILTER(WHERE created_at < NOW()-INTERVAL '24h'
                        AND status NOT IN ('resolved','closed'))::int           AS sla_breached,
        AVG(EXTRACT(EPOCH FROM (
          COALESCE(resolved_at, NOW()) - created_at
        ))/3600)::numeric(8,2)                                                  AS avg_resolution_hrs
      FROM support_tickets
      WHERE created_at > NOW() - INTERVAL '7 days'
    `).catch(() => [{ total_open: 0, sla_breached: 0, avg_resolution_hrs: null }]);

    res.json({
      generated_at:           new Date().toISOString(),
      health: {
        score:    latestRun?.score ?? null,
        status:   latestRun?.status ?? 'unknown',
        last_run: latestRun?.ran_at ?? null,
        components: latestRun?.results?.score?.components ?? null,
      },
      infrastructure:          infra,
      database:                latestRun?.results?.database ?? null,
      email:                   latestRun?.results?.email ?? null,
      radius:                  latestRun?.results?.radius ?? null,
      captive_portal:          latestRun?.results?.captive_portal ?? null,
      router_fleet:            fleet,
      tenant_license_usage:    licenses,
      tenant_qos_rankings:     qos,
      revenue_at_risk:         revenue,
      support_performance:     support[0],
      security_incidents:      openIncidents,
      active_impersonations:   activeImpersonations,
      pending_upgrade_requests: pendingUpgrades,
      pending_upgrade_count:   pendingUpgradeCount[0]?.cnt ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/health/incidents — security incidents
adminRouter.get('/incidents', async (req, res) => {
  const db = req.app.locals.db;
  const { severity, resolved, limit = 50, offset = 0 } = req.query;
  const cond = []; const params = [];
  if (severity) { cond.push(`severity = $${params.length+1}`); params.push(severity); }
  if (resolved === 'false') cond.push('resolved_at IS NULL');
  if (resolved === 'true')  cond.push('resolved_at IS NOT NULL');
  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  params.push(parseInt(limit), parseInt(offset));
  const rows = await db.query(
    `SELECT * FROM security_incidents ${where} ORDER BY created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

// PATCH /api/superadmin/health/incidents/:id/resolve
adminRouter.patch('/incidents/:id/resolve', async (req, res) => {
  const db = req.app.locals.db;
  const [row] = await db.query(
    `UPDATE security_incidents SET resolved_at=NOW(), resolved_by=$1 WHERE id=$2 RETURNING *`,
    [req.superadmin.superadmin_id, req.params.id]
  );
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

module.exports = { publicRouter, adminRouter };
