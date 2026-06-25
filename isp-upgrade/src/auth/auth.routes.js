// src/auth/auth.routes.js — Tenant login & registration with OTP 2FA
const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const { normalizePhone } = require('../utils/phone');
const { sendOTPEmail }   = require('../notifications/email.service');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

// ── SMS helper ────────────────────────────────────────────────────────────────
function getSmsClient() {
  // Skip entirely when key is not configured — no sandbox fallback
  if (!process.env.SMS_API_KEY) return null;
  try {
    const AT = require('africastalking');
    const client = AT({
      apiKey:   process.env.SMS_API_KEY,
      username: process.env.SMS_USERNAME || 'sandbox',
    });
    return client.SMS;
  } catch {
    return null;
  }
}

async function sendSms(phone, message) {
  const sms = getSmsClient();
  if (!sms) {
    // SMS not configured — skip silently (OTP already logged at generation site)
    return;
  }
  if (!phone) return;
  try {
    const result = await sms.send({
      to: [phone],
      message,
      from: process.env.SMS_SENDER_ID || 'iCube',
    });
    console.log('[SMS] sent:', JSON.stringify(result?.SMSMessageData?.Recipients?.[0]));
  } catch (err) {
    console.error('[SMS] send error:', err.message);
  }
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const db = req.app.locals.db;
  const {
    business_name,
    owner_name,
    email,
    // accept both 'phone' (frontend) and 'owner_phone' (legacy) as the same field
    phone: phoneField,
    owner_phone: ownerPhoneField,
    password,
    confirm_password,  // accepted but ignored server-side (validated client-side)
    plan = 'free',
    subdomain,
  } = req.body;

  const rawPhone = phoneField || ownerPhoneField || null;

  if (!business_name || !email || !password) {
    return res.status(400).json({ error: 'business_name, email and password are required' });
  }

  try {
    // Check email uniqueness across admins
    const existing = await db.query(`SELECT id FROM admins WHERE email = $1`, [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    // Also check tenants.owner_email uniqueness
    const tenantCheck = await db.query(`SELECT id FROM tenants WHERE owner_email = $1`, [email]);
    if (tenantCheck.length) return res.status(409).json({ error: 'Email already registered' });

    // Build slug from business_name (or explicit subdomain)
    const baseSlug = (
      subdomain ||
      business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    ).substring(0, 30);

    const slugCheck = await db.query(`SELECT id FROM tenants WHERE slug = $1`, [baseSlug]);
    const finalSlug = slugCheck.length
      ? (baseSlug + '-' + Math.random().toString(36).substring(2, 6)).substring(0, 30)
      : baseSlug;

    const normalizedPhone = normalizePhone(rawPhone) || null;
    const hash            = await bcrypt.hash(password, 10);

    // ── 1. Create tenant ──────────────────────────────────────────────────────
    const [tenant] = await db.query(`
      INSERT INTO tenants
        (name, business_name, slug, owner_email, owner_name, owner_phone,
         plan, status, trial_ends_at, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'trial',
              NOW() + INTERVAL '14 days', $8)
      RETURNING *
    `, [
      business_name,   // name
      business_name,   // business_name
      finalSlug,       // slug
      email,           // owner_email  ← THE KEY MAPPING
      owner_name || null,
      normalizedPhone, // owner_phone
      plan,
      hash,            // password_hash (for tenant-level auth if needed)
    ]);

    // ── 2. Seed branding ──────────────────────────────────────────────────────
    await db.query(`
      INSERT INTO tenant_branding
        (tenant_id, company_name, primary_color, secondary_color, support_email)
      VALUES ($1, $2, '#1D9E75', '#378ADD', $3)
      ON CONFLICT (tenant_id) DO NOTHING
    `, [tenant.id, business_name, email]);

    // ── 3. Create admin login record ──────────────────────────────────────────
    const [admin] = await db.query(`
      INSERT INTO admins (tenant_id, email, password_hash, name, phone, role)
      VALUES ($1, $2, $3, $4, $5, 'admin')
      RETURNING id, email, name, role
    `, [tenant.id, email, hash, owner_name || business_name, normalizedPhone]);

    // ── 4. Auto-provision: create default site + router ─────────────────────
    try {
      const { detectRouterTier } = require('../routers/router-intelligence');
      const crypto2 = require('crypto');

      // Create default site
      const [site] = await db.query(`
        INSERT INTO sites (name, location, tenant_id)
        VALUES ($1, $2, $3) RETURNING *
      `, [`${business_name} Main Site`, 'Main Location', tenant.id]);

      // Auto-provision router
      const radiusSecret = 'rs-' + crypto2.randomBytes(16).toString('hex');
      const bearerToken  = 'icube_' + crypto2.randomBytes(32).toString('hex');
      const installToken = crypto2.randomBytes(32).toString('hex');

      const [portRow] = await db.query(
        `SELECT COALESCE(MAX(vpn_port), 51819) + 1 AS next_port FROM routers`
      );
      const vpnPort  = Math.min(parseInt(portRow.next_port, 10), 51920);

      let privateKey = '', publicKey = '';
      try {
        const { execSync } = require('child_process');
        privateKey = execSync('wg genkey', { encoding: 'utf8' }).trim();
        publicKey  = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf8' }).trim();
      } catch {
        privateKey = crypto2.randomBytes(32).toString('base64');
        publicKey  = crypto2.randomBytes(32).toString('base64');
      }

      const [peerRow] = await db.query(
        `SELECT COALESCE(MAX(wireguard_peer_index), 1) + 1 AS next_idx FROM routers`
      );
      const peerIdx = parseInt(peerRow.next_idx, 10);
      const peerIp  = `10.99.0.${peerIdx}`;
      const tier    = detectRouterTier(null);

      await db.query(`
        INSERT INTO routers
          (tenant_id, site_id, name, ip_address, brand,
           radius_secret, vpn_port, vpn_address,
           wireguard_private_key, wireguard_public_key,
           wireguard_peer_ip, wireguard_peer_index,
           subnet_prefix, subnet_mask, network_address, gateway_ip,
           dhcp_pool_start, dhcp_pool_end, max_users, recommended_users, tier_name,
           status, bearer_token, install_token)
        VALUES
          ($1,$2,$3,'0.0.0.0','mikrotik',
           $4,$5,$6,
           $7,$8,
           $9,$10,
           $11,$12,$13,$14,
           $15,$16,$17,$18,$19,
           'pending',$20,$21)
      `, [
        tenant.id, site.id, `${business_name} Main Router`,
        radiusSecret, vpnPort, `139.84.247.205:${vpnPort}`,
        privateKey, publicKey,
        peerIp, peerIdx,
        tier.subnet_prefix, tier.subnet_mask, tier.network, tier.gateway,
        tier.pool_start, tier.pool_end, tier.max_users, tier.recommended_users, tier.tier_name,
        bearerToken, installToken,
      ]);

      console.log(`[Auth] Auto-provisioned router for tenant ${tenant.slug}`);
    } catch (provisionErr) {
      console.error('[Auth] Auto-provision failed:', provisionErr.message);
    }

    // ── 4. Issue JWT ──────────────────────────────────────────────────────────
    const jwtToken = jwt.sign(
      { admin_id: admin.id, tenant_id: tenant.id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash: _ph, api_token: _at, ...safeTenant } = tenant;
    res.status(201).json({ token: jwtToken, admin, tenant: safeTenant });
  } catch (err) {
    console.error('[Auth] register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/login — step 1: validate credentials, send OTP ─────────────
router.post('/login', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  try {
    const rows = await db.query(`
      SELECT a.*, t.name AS tenant_name, t.status AS tenant_status, t.slug
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.email = $1
    `, [email]);

    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const admin = rows[0];
    const hash = admin.password_hash_bcrypt || admin.password_hash;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (admin.tenant_status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    // Generate OTP and store in Redis (TTL 10 min)
    const otp = generateOtp();
    console.log('[OTP]', email, otp);
    const otpKey = `otp:${email}`;
    await redis.setex(otpKey, 600, JSON.stringify({
      otp,
      admin_id:  admin.id,
      tenant_id: admin.tenant_id,
      role:      admin.role,
    }));

    // Deliver OTP — email is primary, SMS is best-effort
    const phone = admin.phone || null;
    const smsMsg = `Your iCube verification code is: ${otp}. Expires in 10 minutes. Do not share this code.`;

    const [emailErr] = await sendOTPEmail(email, otp).then(() => [null]).catch(e => [e]);
    if (emailErr) console.error('[OTP] email delivery failed:', emailErr.message);

    await sendSms(phone, smsMsg);

    // Mask phone for response
    const maskedPhone = phone
      ? phone.slice(0, 4) + '****' + phone.slice(-2)
      : null;

    res.json({
      status: 'otp_sent',
      message: `Verification code sent to ${email}${maskedPhone ? ` and ${maskedPhone}` : ''}`,
      masked_phone: maskedPhone,
      email, // needed for verify step
    });
  } catch (err) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/verify-otp — step 2: validate OTP, issue JWT ──────────────
router.post('/verify-otp', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'email and otp required' });
  }

  try {
    const raw = await redis.get(`otp:${email}`);
    if (!raw) {
      return res.status(401).json({ error: 'OTP expired or not found. Please log in again.' });
    }

    const stored = JSON.parse(raw);
    if (String(stored.otp) !== String(otp).trim()) {
      return res.status(401).json({ error: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — delete it (one-time use)
    await redis.del(`otp:${email}`);

    // Update last login
    await db.query(`UPDATE admins SET last_login_at = NOW() WHERE id = $1`, [stored.admin_id]);

    // Fetch full admin + tenant
    const rows = await db.query(`
      SELECT a.id, a.email, a.name, a.role, a.tenant_id,
             t.name AS tenant_name, t.status AS tenant_status, t.plan, t.slug
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.id = $1
    `, [stored.admin_id]);

    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    const admin = rows[0];

    const token = jwt.sign(
      { admin_id: admin.id, tenant_id: admin.tenant_id, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Fetch must_change_password and totp_verified
    const [flags] = await db.query(
      `SELECT must_change_password, totp_verified FROM admins WHERE id = $1`, [admin.id]
    );

    res.json({
      token,
      must_change_password: !!flags?.must_change_password,
      totp_enrolled: !!flags?.totp_verified,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      tenant: { id: admin.tenant_id, name: admin.tenant_name, status: admin.tenant_status, slug: admin.slug, plan: admin.plan },
    });
  } catch (err) {
    console.error('[Auth] verify-otp error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/resend-otp ─────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    // Rate limit: check if a recent OTP still has > 540s TTL (sent < 60s ago)
    const ttl = await redis.ttl(`otp:${email}`);
    if (ttl > 540) {
      return res.status(429).json({ error: 'Please wait before requesting another code.' });
    }

    const rows = await db.query(`
      SELECT a.id, a.tenant_id, a.role, a.phone FROM admins a WHERE a.email = $1
    `, [email]);
    if (!rows.length) return res.status(404).json({ error: 'No account with that email' });

    const admin = rows[0];
    const otp   = generateOtp();
    console.log('[OTP]', email, otp);
    await redis.setex(`otp:${email}`, 600, JSON.stringify({
      otp,
      admin_id:  admin.id,
      tenant_id: admin.tenant_id,
      role:      admin.role,
    }));

    const smsMsg2 = `Your iCube verification code is: ${otp}. Expires in 10 minutes.`;
    const [emailErr2] = await sendOTPEmail(email, otp).then(() => [null]).catch(e => [e]);
    if (emailErr2) console.error('[OTP] email delivery failed:', emailErr2.message);
    await sendSms(admin.phone, smsMsg2);

    res.json({ status: 'otp_sent', message: 'New verification code sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const rows = await db.query(`SELECT id, phone FROM admins WHERE email = $1`, [email]);
    // Always return success to avoid user enumeration
    if (!rows.length) return res.json({ status: 'sent', message: 'If that email exists, a reset code was sent.' });

    const admin = rows[0];
    const otp   = generateOtp();
    console.log('[OTP]', email, otp);
    await redis.setex(`reset:${email}`, 600, JSON.stringify({ otp, admin_id: admin.id }));

    const resetMsg = `Your iCube password reset code is: ${otp}. Expires in 10 minutes.`;
    const [emailErr3] = await sendOTPEmail(email, otp).then(() => [null]).catch(e => [e]);
    if (emailErr3) console.error('[OTP] email delivery failed:', emailErr3.message);
    await sendSms(admin.phone, resetMsg);

    res.json({ status: 'sent', message: 'If that email exists, a reset code was sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { email, otp, new_password } = req.body;

  if (!email || !otp || !new_password) {
    return res.status(400).json({ error: 'email, otp and new_password required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const raw = await redis.get(`reset:${email}`);
    if (!raw) return res.status(401).json({ error: 'Reset code expired. Request a new one.' });

    const stored = JSON.parse(raw);
    if (String(stored.otp) !== String(otp).trim()) {
      return res.status(401).json({ error: 'Invalid reset code.' });
    }

    await redis.del(`reset:${email}`);
    const hash = await bcrypt.hash(new_password, 10);
    await db.query(`UPDATE admins SET password_hash = $1 WHERE id = $2`, [hash, stored.admin_id]);

    res.json({ status: 'ok', message: 'Password updated. Please log in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ ok: true });
});

// ── DEV ONLY: GET /api/auth/dev-otp?email=xxx ─────────────────────────────────
// Returns the live OTP from Redis so you can log in without SMS/email.
// NEVER expose this in production.
if (process.env.NODE_ENV !== 'production') {
  router.get('/dev-otp', async (req, res) => {
    const redis = req.app.locals.redis;
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email required' });
    try {
      const raw = await redis.get(`otp:${email}`);
      if (!raw) return res.status(404).json({ error: 'No OTP found for that email' });
      const { otp } = JSON.parse(raw);
      res.json({ email, otp });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const db  = req.app.locals.db;
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    const rows = await db.query(`
      SELECT a.id, a.email, a.name, a.role, a.tenant_id,
             t.name AS tenant_name, t.status AS tenant_status, t.plan, t.slug
      FROM admins a
      JOIN tenants t ON t.id = a.tenant_id
      WHERE a.id = $1
    `, [payload.admin_id]);

    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ── Admin auth middleware (shared by routes below) ────────────────────────────
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (!payload.admin_id) return res.status(403).json({ error: 'Not an admin token' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── POST /api/auth/change-password — self-service password change (logged-in admin) ──
router.post('/change-password', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'current_password and new_password required' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  try {
    const [admin] = await db.query(
      `SELECT id, password_hash, password_hash_bcrypt FROM admins WHERE id = $1`, [req.admin.admin_id]
    );
    const hash = admin.password_hash_bcrypt || admin.password_hash;
    const valid = await bcrypt.compare(current_password, hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await db.query(
      `UPDATE admins SET password_hash = $1, password_hash_bcrypt = $1, must_change_password = FALSE WHERE id = $2`,
      [newHash, admin.id]
    );
    res.json({ ok: true, message: 'Password updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/2fa/setup — generate TOTP secret + QR code ────────────────
router.post('/2fa/setup', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const QRCode = require('qrcode');
  const { authenticator } = require('otplib');
  try {
    const [admin] = await db.query(
      `SELECT id, email, totp_secret, totp_verified FROM admins WHERE id = $1`, [req.admin.admin_id]
    );
    if (!admin) return res.status(404).json({ error: 'User not found' });
    if (admin.totp_verified) {
      return res.status(400).json({ error: '2FA already active. Disable it first from security settings.' });
    }

    const secret = admin.totp_secret || authenticator.generateSecret();
    if (!admin.totp_secret) {
      await db.query(
        `UPDATE admins SET totp_secret = $1, totp_verified = FALSE WHERE id = $2`, [secret, admin.id]
      );
    }
    const otpauthUrl = authenticator.keyuri(admin.email, 'iCube ISP', secret);
    const qrDataUrl  = await QRCode.toDataURL(otpauthUrl);
    res.json({ secret, qr_code: qrDataUrl, otpauth_url: otpauthUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/auth/2fa/verify-setup — confirm first TOTP code, enable 2FA ────
router.post('/2fa/verify-setup', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const { authenticator } = require('otplib');
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const [admin] = await db.query(
      `SELECT id, totp_secret FROM admins WHERE id = $1`, [req.admin.admin_id]
    );
    if (!admin?.totp_secret) {
      return res.status(400).json({ error: '2FA not set up yet. Call /2fa/setup first.' });
    }
    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: admin.totp_secret });
    if (!valid) return res.status(400).json({ error: 'Invalid code. Check your authenticator app and try again.' });

    await db.query(`UPDATE admins SET totp_verified = TRUE WHERE id = $1`, [admin.id]);
    res.json({ ok: true, message: '2FA enabled successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/auth/2fa/disable — disable 2FA (requires current password) ───
router.delete('/2fa/disable', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password required to disable 2FA' });
  try {
    const [admin] = await db.query(
      `SELECT id, password_hash, password_hash_bcrypt FROM admins WHERE id = $1`, [req.admin.admin_id]
    );
    const hash = admin.password_hash_bcrypt || admin.password_hash;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password.' });

    await db.query(
      `UPDATE admins SET totp_secret = NULL, totp_verified = FALSE WHERE id = $1`, [admin.id]
    );
    res.json({ ok: true, message: '2FA disabled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/auth/2fa/status ──────────────────────────────────────────────────
router.get('/2fa/status', requireAdmin, async (req, res) => {
  const db = req.app.locals.db;
  const [row] = await db.query(
    `SELECT totp_verified FROM admins WHERE id = $1`, [req.admin.admin_id]
  );
  res.json({ totp_enabled: !!row?.totp_verified });
});

// ── DELETE /api/auth/account — self-service soft-delete with PII anonymisation ─
// Requires: current password + business name (typed to confirm)
// Effect:   marks tenant 'deleted', anonymises PII, orphans routers,
//           disables RADIUS entries, logs to deletion_log, invalidates session.
// Financial records (payments, billing, audit_logs) are NEVER deleted.
router.delete('/account', requireAdmin, async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { password, business_name } = req.body;

  if (!password || !business_name) {
    return res.status(400).json({ error: 'password and business_name are required to confirm deletion' });
  }

  try {
    // 1. Load admin + tenant
    const [admin] = await db.query(
      `SELECT a.*, t.name AS tenant_name, t.id AS tenant_id, t.slug,
              t.owner_email, t.status AS tenant_status
       FROM admins a JOIN tenants t ON t.id = a.tenant_id
       WHERE a.id = $1`, [req.admin.admin_id]
    );
    if (!admin) return res.status(404).json({ error: 'Account not found' });
    if (admin.tenant_status === 'deleted') {
      return res.status(409).json({ error: 'Account is already scheduled for deletion' });
    }

    // 2. Verify password
    const hash = admin.password_hash_bcrypt || admin.password_hash;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    // 3. Verify business name matches (case-insensitive, trimmed)
    const supplied = business_name.trim().toLowerCase();
    const actual   = (admin.tenant_name || '').trim().toLowerCase();
    if (supplied !== actual) {
      return res.status(400).json({
        error: 'Business name does not match. Please type your exact business name to confirm.',
      });
    }

    const tid = admin.tenant_id;

    await db.query('BEGIN');
    try {
      // 4. Soft-delete: mark tenant deleted + anonymise PII
      const anonEmail = `deleted_${Date.now()}@removed.invalid`;
      await db.query(`
        UPDATE tenants SET
          status          = 'deleted',
          deleted_at      = NOW(),
          deletion_reason = 'self_service',
          owner_email     = $2,
          owner_phone     = NULL,
          owner_name      = 'Deleted Account',
          phone           = NULL,
          password_hash   = NULL,
          api_token       = NULL
        WHERE id = $1
      `, [tid, anonEmail]);

      // 5. Orphan deployed routers (don't delete — hardware is still in the field)
      await db.query(`UPDATE routers SET status = 'orphaned' WHERE tenant_id = $1`, [tid]);

      // 6. Disable RADIUS entries for this tenant's vouchers
      //    Set Cleartext-Password value to 'DISABLED' so FreeRADIUS rejects auth
      await db.query(`
        UPDATE radcheck SET value = 'DISABLED'
        WHERE username IN (
          SELECT code FROM vouchers WHERE tenant_id = $1
        )
      `, [tid]);

      // 7. Expire all active vouchers so no new hotspot sessions start
      await db.query(`
        UPDATE vouchers SET status = 'expired', expires_at = NOW()
        WHERE tenant_id = $1 AND status IN ('unused','active')
      `, [tid]);

      // 8. Anonymise admin records (keep rows — FK to audit_logs)
      await db.query(`
        UPDATE admins SET
          email         = 'deleted_' || id || '@removed.invalid',
          name          = 'Deleted User',
          phone         = NULL,
          password_hash = '',
          password_hash_bcrypt = NULL,
          totp_secret   = NULL,
          totp_verified = FALSE
        WHERE tenant_id = $1
      `, [tid]);

      // 9. Log to deletion_log
      await db.query(`
        INSERT INTO deletion_log
          (deleted_by, deleted_by_email, entity_type, entity_id, entity_name)
        VALUES ($1, $2, 'tenant', $3, $4)
      `, [admin.id, admin.owner_email, tid, admin.tenant_name]);

      // 10. Audit log entry
      await db.query(`
        INSERT INTO audit_logs (tenant_id, actor_id, actor_type, action, entity_type, entity_id, payload)
        VALUES ($1, $2, 'admin', 'tenant.self_deleted', 'tenant', $1, $3)
      `, [tid, admin.id, JSON.stringify({ method: 'self_service', slug: admin.slug })]);

      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

    // 11. Invalidate Redis session/OTP entries for this tenant's email
    await redis.del(`otp:${admin.email}`).catch(() => {});
    await redis.del(`reset:${admin.email}`).catch(() => {});

    res.json({
      ok: true,
      message: 'Your account has been deleted. All active services have been disabled. Financial records are retained as required by law. You will be logged out.',
    });
  } catch (err) {
    console.error('[Account] deletion error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
