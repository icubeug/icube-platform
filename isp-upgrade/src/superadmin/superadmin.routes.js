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
// Step 1: email + password → issues a short-lived pre-auth token if TOTP is enabled,
//         or a full JWT if TOTP has not been set up yet.
// Step 2 (TOTP enabled): POST /api/superadmin/login/totp with pre_auth_token + code
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const rows = await db.query(`SELECT * FROM superadmin_users WHERE email = $1`, [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // If TOTP is enrolled, return a pre-auth token — full JWT requires TOTP step
    if (user.totp_verified && user.totp_secret) {
      const preAuthToken = jwt.sign(
        { pre_auth: true, superadmin_id: user.id },
        SA_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        status: 'totp_required',
        pre_auth_token: preAuthToken,
        message: 'Enter the 6-digit code from your authenticator app.',
      });
    }

    // No TOTP enrolled — issue full JWT (warn frontend to encourage setup)
    const token = jwt.sign(
      { superadmin_id: user.id, role: user.role, email: user.email },
      SA_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      must_change_password: !!user.must_change_password,
      totp_enrolled: false,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/login/totp — step 2: verify TOTP code, issue full JWT
router.post('/login/totp', async (req, res) => {
  const db = req.app.locals.db;
  const { pre_auth_token, code } = req.body;
  if (!pre_auth_token || !code) return res.status(400).json({ error: 'pre_auth_token and code required' });
  try {
    let payload;
    try {
      payload = jwt.verify(pre_auth_token, SA_SECRET);
    } catch {
      return res.status(401).json({ error: 'Pre-auth token expired or invalid. Please log in again.' });
    }
    if (!payload.pre_auth || !payload.superadmin_id) {
      return res.status(401).json({ error: 'Invalid pre-auth token.' });
    }

    const [user] = await db.query(
      `SELECT id, name, email, role, totp_secret, totp_verified, must_change_password FROM superadmin_users WHERE id = $1`,
      [payload.superadmin_id]
    );
    if (!user) return res.status(401).json({ error: 'User not found.' });

    const { authenticator } = require('otplib');
    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: user.totp_secret });
    if (!valid) return res.status(401).json({ error: 'Invalid authenticator code.' });

    const token = jwt.sign(
      { superadmin_id: user.id, role: user.role, email: user.email },
      SA_SECRET,
      { expiresIn: '12h' }
    );
    res.json({
      token,
      must_change_password: !!user.must_change_password,
      totp_enrolled: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/change-password — self-service password change (requires current password)
router.post('/change-password', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  if (new_password.length < 10) {
    return res.status(400).json({ error: 'New password must be at least 10 characters.' });
  }
  try {
    const [user] = await db.query(
      `SELECT id, password_hash FROM superadmin_users WHERE id = $1`, [req.superadmin.superadmin_id]
    );
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = await bcrypt.hash(new_password, 12);
    await db.query(
      `UPDATE superadmin_users SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
      [hash, user.id]
    );
    res.json({ ok: true, message: 'Password updated.' });
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

    const [admins, routers, recentFees, notes, sites, vouchers] = await Promise.all([
      db.query(`SELECT id, email, name, role, created_at FROM admins WHERE tenant_id=$1 ORDER BY created_at ASC`, [req.params.id]),
      db.query(`SELECT id, name, ip_address, vpn_connected, last_heartbeat_at, setup_completed, tier_name, model_name FROM routers WHERE tenant_id=$1 ORDER BY created_at DESC`, [req.params.id]),
      db.query(`SELECT * FROM platform_transactions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 20`, [req.params.id]),
      db.query(`
        SELECT sn.*, su.name AS author_name
        FROM support_notes sn
        LEFT JOIN superadmin_users su ON su.id = sn.author_id
        WHERE sn.tenant_id=$1
        ORDER BY sn.created_at DESC
      `, [req.params.id]),
      db.query(`SELECT id, name, location, status, created_at FROM sites WHERE tenant_id=$1 ORDER BY created_at DESC`, [req.params.id]).catch(() => []),
      db.query(`SELECT id, code, status, use_case, channel, customer_phone, created_at FROM vouchers WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 30`, [req.params.id]).catch(() => []),
    ]);

    res.json({ tenant, admins, routers, recentFees, notes, sites, vouchers });
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
    `, [parseInt(tid,10), site_id||null, name, radiusSecret, vpnPort, vpnAddress,
        privateKey, publicKey, peerIp, peerIdx,
        tier.subnet_prefix, tier.subnet_mask, tier.network, tier.gateway,
        tier.pool_start, tier.pool_end, tier.max_users, tier.recommended_users,
        tier.tier_name, model||null, bearerToken, installToken]);

    const newRouter = row;
    const [tenant]  = await db.query(`SELECT slug, name FROM tenants WHERE id = $1`, [parseInt(tid,10)]);
    const serverPubKey = process.env.WG_SERVER_PUBLIC_KEY || '[SERVER_PUBLIC_KEY]';

    const script = generateZeroTouchScript({
      routerName: name, routerToken: newRouter.router_token, model: model||'Unknown',
      vpnPort, privateKey, serverPublicKey: serverPubKey, peerIp, radiusSecret,
      tier, tenantSlug: tenant?.slug||'default', vpnType: vpn_type,
      vpnUsername: '', vpnPassword: '', ipsecSecret: process.env.VPN_IPSEC_SECRET||'icube-ipsec-2024',
    });

    const installCmd = `/tool fetch url="https://web.icubeug.net/api/v1/router/${tenant?.slug||'default'}/scripts/full/${installToken}" http-header-field="Authorization: Bearer ${bearerToken}" dst-path="icube-setup.rsc" mode=https; :delay 2s; /import file-name="icube-setup.rsc"; :delay 1s; /file remove "icube-setup.rsc"`;

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

// ── TOTP Setup ────────────────────────────────────────────────────────────────
// POST /api/superadmin/totp/setup — generate secret + QR code
router.post('/totp/setup', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { authenticator } = require('otplib');
  const QRCode = require('qrcode');
  try {
    const [user] = await db.query(
      `SELECT id, email, totp_secret FROM superadmin_users WHERE id = $1`,
      [req.superadmin.superadmin_id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    // If already verified, don't expose secret again
    if (user.totp_verified) return res.status(400).json({ error: 'TOTP already set up. Reset it from settings.' });

    const secret = user.totp_secret || authenticator.generateSecret();
    if (!user.totp_secret) {
      await db.query(
        `UPDATE superadmin_users SET totp_secret = $1, totp_verified = FALSE WHERE id = $2`,
        [secret, user.id]
      );
    }
    const otpauthUrl = authenticator.keyuri(user.email, 'iCube Superadmin', secret);
    const qrDataUrl  = await QRCode.toDataURL(otpauthUrl);
    res.json({ secret, qr_code: qrDataUrl, otpauth_url: otpauthUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/superadmin/totp/verify-setup — verify first code and mark as verified
router.post('/totp/verify-setup', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const { authenticator } = require('otplib');
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const [user] = await db.query(
      `SELECT id, totp_secret FROM superadmin_users WHERE id = $1`,
      [req.superadmin.superadmin_id]
    );
    if (!user?.totp_secret) return res.status(400).json({ error: 'TOTP not set up yet. Call /totp/setup first.' });
    const valid = authenticator.verify({ token: String(code).replace(/\s/g,''), secret: user.totp_secret });
    if (!valid) return res.status(400).json({ error: 'Invalid code. Check your authenticator app.' });
    await db.query(
      `UPDATE superadmin_users SET totp_verified = TRUE WHERE id = $1`, [user.id]
    );
    res.json({ ok: true, message: 'TOTP set up successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/superadmin/totp/status — check if current superadmin has TOTP
router.get('/totp/status', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const [row] = await db.query(
    `SELECT totp_verified FROM superadmin_users WHERE id = $1`, [req.superadmin.superadmin_id]
  );
  res.json({ has_totp: !!row?.totp_verified });
});

// ── Create Tenant ─────────────────────────────────────────────────────────────
// POST /api/superadmin/tenants
router.post('/tenants', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const crypto = require('crypto');
  const { business_name, owner_name, owner_email, owner_phone, password, site_limit = 5, plan = 'free' } = req.body;
  if (!business_name || !owner_email) return res.status(400).json({ error: 'business_name and owner_email required' });

  const finalPassword = password || crypto.randomBytes(8).toString('hex');
  const passwordHash  = await bcrypt.hash(finalPassword, 12);
  const slug = business_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  try {
    // Check email uniqueness across admins
    const existing = await db.query(`SELECT id FROM admins WHERE email = $1`, [owner_email]);
    if (existing.length) return res.status(400).json({ error: 'An admin with this email already exists' });

    // Create tenant
    const [tenant] = await db.query(`
      INSERT INTO tenants (name, slug, owner_email, plan, status, max_sites)
      VALUES ($1, $2, $3, $4, 'active', $5) RETURNING *
    `, [business_name, slug, owner_email, plan, site_limit]);

    // Create owner admin
    await db.query(`
      INSERT INTO admins (tenant_id, name, email, phone, password_hash, role)
      VALUES ($1, $2, $3, $4, $5, 'admin')
    `, [tenant.id, owner_name || owner_email.split('@')[0], owner_email, owner_phone || null, passwordHash]);

    res.status(201).json({
      tenant,
      credentials: { email: owner_email, password: finalPassword },
      message: `Tenant "${business_name}" created successfully.`,
    });
  } catch (err) {
    if (err.message.includes('unique') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'A tenant with this name or email already exists.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Reset Tenant Admin Password ───────────────────────────────────────────────
// POST /api/superadmin/tenants/:id/reset-password
router.post('/tenants/:id/reset-password', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;
  const crypto = require('crypto');
  try {
    const admins = await db.query(
      `SELECT id, email FROM admins WHERE tenant_id = $1 ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END LIMIT 1`,
      [req.params.id]
    );
    if (!admins.length) return res.status(404).json({ error: 'No admin found for this tenant' });
    const admin = admins[0];
    const newPassword = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(newPassword, 12);
    await db.query(
      `UPDATE admins SET password_hash = $1, must_change_password = TRUE WHERE id = $2`,
      [hash, admin.id]
    );
    res.json({ email: admin.email, new_password: newPassword, must_change_password: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Tenant (confirmed by business name on frontend) ────────────────────
// POST /api/superadmin/tenants/:id/delete
router.post('/tenants/:id/delete', requireSuperadmin, async (req, res) => {
  const db = req.app.locals.db;

  try {

    // Fetch tenant info before deletion
    const [tenant] = await db.query(`SELECT * FROM tenants WHERE id = $1`, [req.params.id]);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const tid = req.params.id;
    await db.query('BEGIN');
    try {
      // Disable RADIUS entries first (so no new hotspot auth happens during cleanup)
      await db.query(`
        UPDATE radcheck SET value = 'DISABLED'
        WHERE username IN (SELECT code FROM vouchers WHERE tenant_id = $1)
      `, [tid]);

      // Delete in correct FK dependency order
      // Leaf tables first, then parents
      await db.query(`DELETE FROM hotspot_sessions       WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM portal_payments        WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM router_heartbeats      WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM impersonation_sessions WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM remote_sessions        WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM audit_logs             WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM security_incidents     WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM vouchers               WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM packages               WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM customers              WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM router_metrics         WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM router_setup_configs   WHERE router_id IN (SELECT id FROM routers WHERE tenant_id = $1)`, [tid]).catch(() => {});
      await db.query(`DELETE FROM routers                WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM sites                  WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM float_accounts         WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM float_transactions     WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM float_purchases        WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM disbursements          WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM platform_transactions  WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM billing_invoices       WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM tenant_billing         WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM payments               WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM pppoe_subscribers      WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM pppoe_plans            WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM admins                 WHERE tenant_id = $1`, [tid]);
      await db.query(`DELETE FROM tenant_branding        WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM support_notes          WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM ai_conversations       WHERE tenant_id = $1`, [tid]).catch(() => {});
      await db.query(`DELETE FROM tenants                WHERE id = $1`,        [tid]);

      // Log deletion
      const [saUser] = await db.query(
        `SELECT email FROM superadmin_users WHERE id = $1`, [req.superadmin.superadmin_id]
      );
      await db.query(`
        INSERT INTO deletion_log (deleted_by, deleted_by_email, entity_type, entity_id, entity_name)
        VALUES ($1, $2, 'tenant', $3, $4)
      `, [req.superadmin.superadmin_id, saUser?.email, tid, tenant.name]);

      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

    res.json({ ok: true, deleted_tenant: tenant.name, message: `Tenant "${tenant.name}" has been permanently deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── License management (superadmin) ──────────────────────────────────────────

const { setLicense, getAllUsage, reviewUpgrade } = require('../licensing/license.service');

// GET /api/superadmin/licenses — all tenant license usage
router.get('/licenses', requireSuperadmin, async (req, res) => {
  try { res.json(await getAllUsage(req.app.locals.db)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/superadmin/licenses/:tenant_id — update limits
router.put('/licenses/:tenant_id', requireSuperadmin, async (req, res) => {
  const { max_sites, max_routers, notes } = req.body;
  if (max_sites === undefined && max_routers === undefined)
    return res.status(400).json({ error: 'max_sites or max_routers required' });
  try {
    const current = await require('../licensing/license.service').getLicense(req.app.locals.db, req.params.tenant_id);
    const row = await setLicense(req.app.locals.db, req.params.tenant_id, {
      max_sites:   max_sites   ?? current.max_sites,
      max_routers: max_routers ?? current.max_routers,
      notes,
      updated_by: req.superadmin.superadmin_id,
    });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/superadmin/licenses/upgrade-requests
router.get('/licenses/upgrade-requests', requireSuperadmin, async (req, res) => {
  const { status = 'pending' } = req.query;
  try {
    const rows = await req.app.locals.db.query(
      `SELECT cur.*, t.name AS tenant_name, t.slug AS tenant_slug
       FROM capacity_upgrade_requests cur
       JOIN tenants t ON t.id = cur.tenant_id
       WHERE cur.status = $1
       ORDER BY cur.created_at`,
      [status]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/superadmin/licenses/upgrade-requests/:id — approve or reject
router.patch('/licenses/upgrade-requests/:id', requireSuperadmin, async (req, res) => {
  const { status, review_notes } = req.body;
  if (!['approved','rejected'].includes(status))
    return res.status(400).json({ error: 'status must be approved or rejected' });
  try {
    const row = await reviewUpgrade(req.app.locals.db, req.params.id, {
      status,
      review_notes,
      reviewed_by: req.superadmin.superadmin_id,
    });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
