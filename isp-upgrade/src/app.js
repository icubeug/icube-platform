// src/app.js  (UPGRADED — replaces original)
// Wires all new modules: agent POS, PPPoE, multi-router, multi-tenancy,
// remote terminal, Stripe, plus all existing services.

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const { Pool }   = require('pg');
const Redis      = require('ioredis');
const cron       = require('node-cron');

const app    = express();
const server = http.createServer(app);

// ── Body parsers ──────────────────────────────────────────────────────────────
// Stripe webhooks need raw body — mount BEFORE express.json()
app.use('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  require('./payments/stripe.routes').webhookRouter
);
app.use(express.json());

// ── Database & cache ──────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const db = {
  query: (sql, params) => pool.query(sql, params).then(r => r.rows),
};

app.locals.db    = db;
app.locals.redis = redis;

// ── Public auth routes (no tenant middleware) ─────────────────────────────────
app.use('/api/auth', require('./auth/auth.routes'));

// ── Superadmin routes (no tenant middleware) ──────────────────────────────────
app.use('/api/superadmin', require('./superadmin/superadmin.routes'));

// ── Router heartbeat — public, no tenant auth (called from MikroTik) ─────────
const { handleHeartbeat } = require('./vpn/vpn.service');
app.post('/api/v1/routers/heartbeat', async (req, res) => {
  try {
    const result = await handleHeartbeat(req.app.locals.db, req.body);
    res.json({ ok: true, router: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Multi-tenancy resolution (runs on all /api/v1/* routes) ──────────────────
const { resolveTenant } = require('./multitenant/tenant.middleware');
app.use('/api/v1', resolveTenant);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/ai',       require('./ai/ai.routes'));
app.use('/api/v1/agents',   require('./agent/agent.routes'));
app.use('/api/v1/pppoe',    require('./pppoe/pppoe.routes'));
app.use('/api/v1/routers',  require('./multirouter/router.routes'));
app.use('/api/v1/tenants',  require('./multitenant/tenant.routes'));
app.use('/api/v1/payments', require('./payments/payment.routes'));
app.use('/api/v1/vouchers', require('./vouchers/voucher.routes'));
app.use('/api/v1/sites',        require('./sites/site.routes'));
app.use('/api/v1/support',      require('./support/support.routes'));
app.use('/api/v1/float',        require('./float/float.routes'));
app.use('/api/v1/disbursements',require('./disbursements/disbursement.routes'));
app.use('/api/v1/transactions', require('./transactions/transaction.routes'));
app.use('/api/v1/billing',      require('./billing/billing.routes'));
app.use('/api/v1/settings',     require('./settings/settings.routes'));
app.use('/api/v1/features',     require('./features/features.routes'));
app.use('/api/v1/users',        require('./users/users.routes'));
app.use('/api/v1/sales',        require('./sales/sales.routes'));
app.use('/api/v1/packages',     require('./packages/packages.routes'));

// ── WebSocket terminal server ─────────────────────────────────────────────────
const { handleTerminalSession } = require('./remote/terminal.service');

const wss = new WebSocket.Server({ server, path: '/ws/terminal' });

wss.on('connection', async (ws, req) => {
  // Auth: parse ?token=JWT from query string
  const url   = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const router_id = url.searchParams.get('router_id');

  if (!token || !router_id) {
    ws.close(1008, 'Missing token or router_id');
    return;
  }

  try {
    const jwt     = require('jsonwebtoken');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    await handleTerminalSession(ws, db, redis, {
      router_id,
      admin_id:  payload.admin_id,
      tenant_id: payload.tenant_id,
    });
  } catch (err) {
    ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
    ws.close(1008, 'Unauthorized');
  }
});

// ── Scheduled jobs ────────────────────────────────────────────────────────────
const { runBillingCycle }    = require('./pppoe/pppoe.service');
const { sweepOfflineRouters } = require('./vpn/vpn.service');

// PPPoE auto-billing — daily at 07:00 Uganda time (UTC+3 = 04:00 UTC)
cron.schedule('0 4 * * *', async () => {
  console.log('[CRON] Running PPPoE billing cycle...');
  await runBillingCycle(db, redis);
});

// Voucher expiry sweep — every hour
cron.schedule('0 * * * *', async () => {
  await db.query(`
    UPDATE vouchers
    SET status = 'expired'
    WHERE status = 'active'
      AND expires_at < NOW()
  `);
  await redis.del('ai:site_status');
});

// AI cache refresh — every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  await redis.del('ai:site_status', 'ai:network_metrics', 'ai:revenue_summary');
});

// VPN offline sweep — every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  await sweepOfflineRouters(db);
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async (_, res) => {
  const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  res.json({ status: dbOk && redisOk ? 'ok' : 'degraded', db: dbOk, redis: redisOk, ts: Date.now() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`[ISP Platform] listening on :${PORT}`));

module.exports = { app, server };
