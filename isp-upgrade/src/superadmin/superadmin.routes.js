// src/superadmin/superadmin.routes.js — iCube superadmin API
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

const SA_SECRET = process.env.SUPERADMIN_JWT_SECRET || process.env.JWT_SECRET || 'dev-jwt-secret';

// ── Superadmin auth middleware ────────────────────────────────────────────────
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

// POST /api/superadmin/login
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const rows = await db.query(
      `SELECT * FROM superadmin_users WHERE email = $1`, [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { superadmin_id: user.id, role: user.role, email: user.email },
      SA_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/me
router.get('/me', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const rows = await db.query(
    `SELECT id, name, email, role, created_at FROM superadmin_users WHERE id = $1`,
    [req.superadmin.superadmin_id]
  );
  res.json(rows[0] || null);
});

// ── Dashboard stats ────────────────────────────────────────────────────────
router.get('/dashboard', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [[stats], [revenueRow], tenants, recentFees] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*) FROM tenants) AS total_tenants,
          (SELECT COUNT(*) FROM tenants WHERE status='active') AS active_tenants,
          (SELECT COUNT(*) FROM tenants WHERE status='trial') AS trial_tenants,
          (SELECT COUNT(*) FROM tenants WHERE status='suspended') AS suspended_tenants,
          (SELECT COUNT(*) FROM routers WHERE vpn_connected=true) AS vpn_online,
          (SELECT COUNT(*) FROM routers) AS total_routers
      `),
      db.query(`
        SELECT
          COALESCE(SUM(fee_amount),0) AS total_fees_all_time,
          COALESCE(SUM(CASE WHEN created_at >= date_trunc('month',NOW()) THEN fee_amount END),0) AS fees_this_month,
          COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '7 days' THEN fee_amount END),0) AS fees_this_week
        FROM platform_transactions WHERE type='platform_fee'
      `),
      db.query(`
        SELECT t.id, t.name, t.slug, t.status, t.plan, t.created_at, t.trial_ends_at,
               COUNT(DISTINCT v.id) AS vouchers_sold,
               COALESCE(SUM(pt.fee_amount),0) AS fees_generated
        FROM tenants t
        LEFT JOIN vouchers v ON v.tenant_id = t.id AND v.status='sold'
        LEFT JOIN platform_transactions pt ON pt.tenant_id = t.id AND pt.type='platform_fee'
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT 10
      `),
      db.query(`
        SELECT pt.*, t.name AS tenant_name
        FROM platform_transactions pt
        JOIN tenants t ON t.id = pt.tenant_id
        WHERE pt.type = 'platform_fee'
        ORDER BY pt.created_at DESC
        LIMIT 20
      `),
    ]);

    // Daily fees for the last 30 days
    const dailyFees = await db.query(`
      SELECT date_trunc('day', created_at)::date AS day,
             SUM(fee_amount) AS amount
      FROM platform_transactions
      WHERE type='platform_fee' AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `);

    res.json({ stats, revenue: revenueRow, tenants, recentFees, dailyFees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Tenants ────────────────────────────────────────────────────────────────
router.get('/tenants', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { status, q, page = 1, per_page = 20 } = req.query;
  try {
    const conditions = [];
    const params = [];
    if (status) { conditions.push(`t.status = $${params.length+1}`); params.push(status); }
    if (q)      { conditions.push(`(t.name ILIKE $${params.length+1} OR t.slug ILIKE $${params.length+1})`); params.push(`%${q}%`); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const offset = (parseInt(page)-1) * parseInt(per_page);
    params.push(parseInt(per_page), offset);

    const [countRow] = await db.query(
      `SELECT COUNT(*) FROM tenants t ${where}`, params.slice(0, params.length-2)
    );

    const rows = await db.query(`
      SELECT t.*, t.owner_name, t.owner_phone,
             COUNT(DISTINCT a.id) AS admin_count,
             COUNT(DISTINCT r.id) AS router_count,
             COALESCE(SUM(pt.fee_amount),0) AS total_fees
      FROM tenants t
      LEFT JOIN admins a ON a.tenant_id = t.id
      LEFT JOIN routers r ON r.tenant_id = t.id
      LEFT JOIN platform_transactions pt ON pt.tenant_id = t.id AND pt.type='platform_fee'
      ${where}
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    res.json({ data: rows, total: parseInt(countRow.count), page: parseInt(page), per_page: parseInt(per_page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/tenants/:id
router.get('/tenants/:id', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const [tenant] = await db.query(`
      SELECT t.*,
             COUNT(DISTINCT a.id) AS admin_count,
             COUNT(DISTINCT r.id) AS router_count,
             COUNT(DISTINCT v.id) FILTER (WHERE v.status='sold') AS vouchers_sold,
             COALESCE(SUM(pt.fee_amount),0) AS total_fees
      FROM tenants t
      LEFT JOIN admins a ON a.tenant_id = t.id
      LEFT JOIN routers r ON r.tenant_id = t.id
      LEFT JOIN vouchers v ON v.tenant_id = t.id
      LEFT JOIN platform_transactions pt ON pt.tenant_id = t.id AND pt.type='platform_fee'
      WHERE t.id = $1
      GROUP BY t.id
    `, [req.params.id]);

    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const [admins, routers, recentFees, notes] = await Promise.all([
      db.query(`SELECT id, email, name, role, created_at FROM admins WHERE tenant_id=$1`, [req.params.id]),
      db.query(`SELECT id, name, ip_address, vpn_connected, last_heartbeat_at, setup_completed FROM routers WHERE tenant_id=$1`, [req.params.id]),
      db.query(`SELECT * FROM platform_transactions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20`, [req.params.id]),
      db.query(`
        SELECT sn.*, su.name AS author_name
        FROM support_notes sn
        LEFT JOIN superadmin_users su ON su.id = sn.author_id
        WHERE sn.tenant_id=$1
        ORDER BY sn.created_at DESC
      `, [req.params.id]),
    ]);

    res.json({ tenant, admins, routers, recentFees, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/superadmin/tenants/:id — update status, plan, notes, max_sites
router.patch('/tenants/:id', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { status, plan, notes, max_sites } = req.body;
  const sets = [];
  const params = [];
  if (status)    { sets.push(`status = $${params.length+1}`);    params.push(status); }
  if (plan)      { sets.push(`plan = $${params.length+1}`);      params.push(plan); }
  if (notes !== undefined) { sets.push(`notes = $${params.length+1}`); params.push(notes); }
  if (max_sites !== undefined) { sets.push(`max_sites = $${params.length+1}`); params.push(parseInt(max_sites, 10)); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  try {
    const [row] = await db.query(
      `UPDATE tenants SET ${sets.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/impersonate/:tenant_id — generate short-lived admin JWT
router.post('/impersonate/:tenant_id', requireSuperadmin, async (req, res) => {
  const db         = req.app.locals.db;
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
  try {
    // Find the primary admin for this tenant
    const admins = await db.query(`
      SELECT a.id, a.email, a.name, a.role, t.name AS tenant_name, t.slug
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.tenant_id = $1
      ORDER BY CASE a.role WHEN 'admin' THEN 0 ELSE 1 END, a.created_at ASC
      LIMIT 1
    `, [req.params.tenant_id]);

    if (!admins.length) return res.status(404).json({ error: 'No admin found for this tenant' });
    const admin = admins[0];

    const token = jwt.sign(
      {
        admin_id:        admin.id,
        tenant_id:       req.params.tenant_id,
        role:            admin.role,
        impersonating:   true,
        superadmin_id:   req.superadmin.superadmin_id,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      admin_id:     admin.id,
      tenant_id:    req.params.tenant_id,
      tenant_name:  admin.tenant_name,
      tenant_slug:  admin.slug,
      impersonating: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Support notes ──────────────────────────────────────────────────────────
router.get('/support', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const notes = await db.query(`
      SELECT sn.*, su.name AS author_name, t.name AS tenant_name
      FROM support_notes sn
      LEFT JOIN superadmin_users su ON su.id = sn.author_id
      JOIN tenants t ON t.id = sn.tenant_id
      ORDER BY sn.created_at DESC
      LIMIT 100
    `);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/support/notes', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { tenant_id, note } = req.body;
  if (!tenant_id || !note) return res.status(400).json({ error: 'tenant_id and note required' });
  try {
    const [row] = await db.query(`
      INSERT INTO support_notes (tenant_id, author_id, note)
      VALUES ($1, $2, $3) RETURNING *
    `, [tenant_id, req.superadmin.superadmin_id, note]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Revenue ────────────────────────────────────────────────────────────────
router.get('/revenue', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { from, to } = req.query;
  try {
    const fromDate = from || new Date(Date.now() - 30*24*60*60*1000).toISOString();
    const toDate   = to   || new Date().toISOString();

    const [summary, byTenant, bySource, daily] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(gross_amount),0) AS gross,
          COALESCE(SUM(fee_amount),0)   AS fees,
          COALESCE(SUM(net_amount),0)   AS net,
          COUNT(*) AS transactions
        FROM platform_transactions
        WHERE type='platform_fee' AND created_at BETWEEN $1 AND $2
      `, [fromDate, toDate]),

      db.query(`
        SELECT t.name AS tenant_name, t.id AS tenant_id,
               COALESCE(SUM(pt.fee_amount),0) AS fees,
               COUNT(pt.id) AS tx_count
        FROM platform_transactions pt
        JOIN tenants t ON t.id = pt.tenant_id
        WHERE pt.type='platform_fee' AND pt.created_at BETWEEN $1 AND $2
        GROUP BY t.id, t.name
        ORDER BY fees DESC
      `, [fromDate, toDate]),

      db.query(`
        SELECT source, COALESCE(SUM(fee_amount),0) AS fees, COUNT(*) AS count
        FROM platform_transactions
        WHERE type='platform_fee' AND created_at BETWEEN $1 AND $2
        GROUP BY source
      `, [fromDate, toDate]),

      db.query(`
        SELECT date_trunc('day', created_at)::date AS day,
               SUM(fee_amount) AS fees, SUM(gross_amount) AS gross, COUNT(*) AS count
        FROM platform_transactions
        WHERE type='platform_fee' AND created_at BETWEEN $1 AND $2
        GROUP BY 1 ORDER BY 1
      `, [fromDate, toDate]),
    ]);

    res.json({ summary: summary[0], byTenant, bySource, daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Platform Settings ──────────────────────────────────────────────────────
router.get('/settings', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.query(`SELECT * FROM platform_settings ORDER BY key`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const updates = req.body; // { key: value, ... }
  try {
    for (const [key, value] of Object.entries(updates)) {
      await db.query(`
        INSERT INTO platform_settings (key, value)
        VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [key, String(value)]);
    }
    const rows = await db.query(`SELECT * FROM platform_settings ORDER BY key`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Staff management ───────────────────────────────────────────────────────
router.get('/staff', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.query(
      `SELECT id, name, email, role, created_at FROM superadmin_users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/staff', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { name, email, password, role = 'support' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [row] = await db.query(`
      INSERT INTO superadmin_users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, role, created_at
    `, [name, email, hash, role]);
    res.status(201).json(row);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.delete('/staff/:id', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  if (req.superadmin.superadmin_id === req.params.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  try {
    await db.query(`DELETE FROM superadmin_users WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Router requests ────────────────────────────────────────────────────────
router.get('/router-requests', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.query(`
      SELECT rr.*, t.name AS tenant_name, t.owner_email, t.slug AS tenant_slug
      FROM router_requests rr
      JOIN tenants t ON t.id = rr.tenant_id
      ORDER BY rr.created_at DESC LIMIT 50
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/router-requests/:id', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { status } = req.body;
  try {
    const [row] = await db.query(`
      UPDATE router_requests
      SET status = $1, handled_by = $2, handled_at = NOW()
      WHERE id = $3 RETURNING *
    `, [status, req.superadmin.superadmin_id, req.params.id]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/superadmin/tenants/:tenant_id/routers/zero-touch
// Superadmin creates a router + ZTP script for a tenant without impersonation
router.post('/tenants/:tenant_id/routers/zero-touch', requireSuperadmin, async (req, res) => {
  const db     = req.app.locals.db;
  const tid    = req.params.tenant_id;
  const crypto = require('crypto');
  const { name, model, site_id, vpn_type = 'wireguard' } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const { detectRouterTier, generateZeroTouchScript } = require('../routers/router-intelligence');
    const tier         = detectRouterTier(model);
    const radiusSecret = 'rs-' + crypto.randomBytes(16).toString('hex');
    const bearerToken  = 'icube_' + crypto.randomBytes(32).toString('hex');
    const installToken = crypto.randomBytes(32).toString('hex');

    const [portRow] = await db.query(`SELECT COALESCE(MAX(vpn_port), 51819) + 1 AS next_port FROM routers`);
    const vpnPort   = Math.min(parseInt(portRow.next_port, 10), 51920);
    const vpnAddress = `vpn.icubeug.net:${vpnPort}`;

    let privateKey = '', publicKey = '';
    try {
      const { execSync } = require('child_process');
      privateKey = execSync('wg genkey', { encoding: 'utf8' }).trim();
      publicKey  = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf8' }).trim();
    } catch {
      const buf  = () => crypto.randomBytes(32).toString('base64');
      privateKey = buf(); publicKey = buf();
    }

    const [peerRow] = await db.query(`SELECT COALESCE(MAX(wireguard_peer_index), 1) + 1 AS next_idx FROM routers`);
    const peerIdx   = parseInt(peerRow.next_idx, 10);
    const peerIp    = `10.99.0.${peerIdx}`;

    const [row] = await db.query(`
      INSERT INTO routers
        (tenant_id, site_id, name, ip_address, brand, radius_secret,
         vpn_port, vpn_address, wireguard_private_key, wireguard_public_key,
         wireguard_peer_ip, wireguard_peer_index, subnet_prefix, subnet_mask,
         network_address, gateway_ip, dhcp_pool_start, dhcp_pool_end,
         max_users, recommended_users, tier_name, model_name, status,
         bearer_token, install_token)
      VALUES ($1,$2,$3,'0.0.0.0','mikrotik',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pending',$21,$22)
      RETURNING *
    `, [tid, site_id||null, name, radiusSecret, vpnPort, vpnAddress,
        privateKey, publicKey, peerIp, peerIdx,
        tier.subnet_prefix, tier.subnet_mask, tier.network, tier.gateway,
        tier.pool_start, tier.pool_end, tier.max_users, tier.recommended_users,
        tier.tier_name, model||null, bearerToken, installToken]);

    const newRouter = row;
    const [tenant]  = await db.query(`SELECT slug, name FROM tenants WHERE id = $1`, [tid]);
    const serverPubKey = process.env.WG_SERVER_PUBLIC_KEY || '[SERVER_PUBLIC_KEY]';

    const script = generateZeroTouchScript({
      routerName: name, routerToken: newRouter.router_token, model: model||'Unknown',
      vpnPort, privateKey, serverPublicKey: serverPubKey, peerIp, radiusSecret,
      tier, tenantSlug: tenant?.slug||'default', vpnType: vpn_type,
      vpnUsername: '', vpnPassword: '', ipsecSecret: process.env.VPN_IPSEC_SECRET||'icube-ipsec-2024',
    });

    const installCmd = `/tool fetch url="https://139.84.247.205/api/v1/router/${tenant?.slug||'default'}/scripts/full/${installToken}" http-header-field="Authorization: Bearer ${bearerToken}" dst-path="icube-setup.rsc" mode=https; :delay 2s; /import file-name="icube-setup.rsc"; :delay 1s; /file remove "icube-setup.rsc"`;

    res.status(201).json({ router: newRouter, script, install_command: installCmd, bearer_token: bearerToken, install_token: installToken,
      config: { vpn_port: vpnPort, vpn_address: vpnAddress, tier: tier.tier_name, network: tier.network, gateway: tier.gateway, max_users: tier.max_users } });
  } catch (err) {
    console.error('[SA ZTP]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── VPN / Router overview ──────────────────────────────────────────────────
router.get('/routers', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  try {
    const rows = await db.query(`
      SELECT r.id, r.name, r.ip_address, r.vpn_username, r.vpn_ip,
             r.vpn_connected, r.last_heartbeat_at, r.setup_completed,
             t.name AS tenant_name, t.id AS tenant_id
      FROM routers r
      JOIN tenants t ON t.id = r.tenant_id
      ORDER BY r.vpn_connected DESC, r.last_heartbeat_at DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
