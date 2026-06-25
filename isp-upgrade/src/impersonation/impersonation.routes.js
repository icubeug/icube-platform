// src/impersonation/impersonation.routes.js
// Super Admin only — enter/exit tenant environments with full audit logging.
//
// POST /api/superadmin/impersonate/:tenant_id  — start session, get tenant JWT
// POST /api/superadmin/impersonate/:session_id/action — append action to log
// POST /api/superadmin/impersonate/:session_id/end  — end session
// GET  /api/superadmin/impersonate            — list sessions (with filter)

const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const SA_SECRET  = process.env.SUPERADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret';
const ADM_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// Middleware: require superadmin token
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

router.use(requireSuperadmin);

// POST /start/:tenant_id — enter a tenant environment
router.post('/start/:tenant_id', async (req, res) => {
  const db = req.app.locals.db;
  const [tenant] = await db.query(
    `SELECT id, name, slug FROM tenants WHERE id = $1`, [req.params.tenant_id]
  );
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  // Create an impersonation session record
  const [session] = await db.query(
    `INSERT INTO impersonation_sessions
       (superadmin_id, superadmin_email, tenant_id, tenant_slug, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      req.superadmin.superadmin_id,
      req.superadmin.email,
      tenant.id,
      tenant.slug,
      req.ip,
      req.headers['user-agent'] || null,
    ]
  );

  // Issue a short-lived admin JWT scoped to this tenant
  const impersonation_token = jwt.sign(
    {
      impersonation_session_id: session.id,
      superadmin_id: req.superadmin.superadmin_id,
      tenant_id:     tenant.id,
      role:          'superadmin_impersonation',
      email:         req.superadmin.email,
    },
    ADM_SECRET,
    { expiresIn: '2h' }
  );

  res.status(201).json({
    session_id:          session.id,
    tenant:              { id: tenant.id, name: tenant.name, slug: tenant.slug },
    impersonation_token,
    expires_in:          '2h',
    warning:             'All actions in this session are logged and cannot be deleted.',
  });
});

// POST /:session_id/action — append a logged action
router.post('/:session_id/action', async (req, res) => {
  const db = req.app.locals.db;
  const { action_type, description, metadata } = req.body;
  if (!action_type) return res.status(400).json({ error: 'action_type required' });

  const entry = {
    action_type,
    description: description || null,
    metadata:    metadata || {},
    timestamp:   new Date().toISOString(),
    ip:          req.ip,
  };

  const [updated] = await db.query(
    `UPDATE impersonation_sessions
     SET actions = actions || $1::jsonb
     WHERE id = $2 AND superadmin_id = $3 AND ended_at IS NULL
     RETURNING id`,
    [JSON.stringify([entry]), req.params.session_id, req.superadmin.superadmin_id]
  );
  if (!updated) return res.status(404).json({ error: 'Session not found or already ended' });
  res.json({ logged: true, entry });
});

// POST /:session_id/end — end session
router.post('/:session_id/end', async (req, res) => {
  const db = req.app.locals.db;
  const [session] = await db.query(
    `UPDATE impersonation_sessions SET ended_at = NOW()
     WHERE id = $1 AND superadmin_id = $2 AND ended_at IS NULL
     RETURNING *`,
    [req.params.session_id, req.superadmin.superadmin_id]
  );
  if (!session) return res.status(404).json({ error: 'Session not found or already ended' });
  res.json({ ended: true, session });
});

// GET / — list sessions
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const { tenant_id, active, limit = 50, offset = 0 } = req.query;
  const cond   = [];
  const params = [];

  if (tenant_id) { cond.push(`tenant_id = $${params.length+1}`); params.push(tenant_id); }
  if (active === 'true')  cond.push('ended_at IS NULL');
  if (active === 'false') cond.push('ended_at IS NOT NULL');

  const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
  params.push(parseInt(limit), parseInt(offset));

  const rows = await db.query(
    `SELECT id, superadmin_email, tenant_id, tenant_slug, ip_address,
            started_at, ended_at, jsonb_array_length(actions) AS action_count
     FROM impersonation_sessions ${where}
     ORDER BY started_at DESC
     LIMIT $${params.length-1} OFFSET $${params.length}`,
    params
  );
  res.json(rows);
});

// GET /:session_id — full session with actions
router.get('/:session_id', async (req, res) => {
  const db = req.app.locals.db;
  const [session] = await db.query(
    `SELECT * FROM impersonation_sessions WHERE id = $1`, [req.params.session_id]
  );
  if (!session) return res.status(404).json({ error: 'Not found' });
  res.json(session);
});

module.exports = router;
