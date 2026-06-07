// src/portal/portal.routes.js
// Captive portal API — served at /api/portal/*
// No tenant auth middleware (public, called from browsers behind hotspot)

const express = require('express');
const router  = express.Router();
const { generateVoucherCode, syncVoucherToRadius } = require('../vouchers/voucher.service');
const { sendSMS } = require('../notifications/sms.service');
const { normalizePhone } = require('../utils/phone');
const { createPayment } = require('../payments/payment.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

function mtnPrefixes()    { return ['077','078','076','039']; }
function airtelPrefixes() { return ['070','075','074']; }

function detectProvider(phone) {
  const local = phone.replace('+256', '0').slice(0, 3);
  if (mtnPrefixes().includes(local))    return 'mtn';
  if (airtelPrefixes().includes(local)) return 'airtel';
  return 'mtn'; // default
}

function makeRef() {
  return 'PP-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

// ── GET /api/portal/:slug — tenant branding + packages ────────────────────────
router.get('/:slug', async (req, res) => {
  const db = req.app.locals.db;
  const { slug } = req.params;
  try {
    const tenantRows = await db.query(`
      SELECT t.*, tb.logo_url, tb.primary_color, tb.secondary_color,
             tb.company_name, tb.support_phone, tb.support_email,
             tb.portal_template, tb.portal_theme
      FROM tenants t
      LEFT JOIN tenant_branding tb ON tb.tenant_id = t.id
      WHERE t.slug = $1 AND t.status != 'suspended'
    `, [slug]);

    if (!tenantRows.length) return res.status(404).json({ error: 'Portal not found' });
    const tenant = tenantRows[0];

    // Load active packages for this tenant
    const pkgRows = await db.query(`
      SELECT id, name, speed_mbps, download_mbps, upload_mbps,
             duration_hrs, duration_label, price_ugx, active
      FROM packages
      WHERE tenant_id = $1 AND active = true
      ORDER BY price_ugx ASC
    `, [tenant.id]);

    res.json({
      tenant: {
        id:            tenant.id,
        slug:          tenant.slug,
        name:          tenant.company_name || tenant.name,
        logo_url:      tenant.logo_url,
        primary_color: tenant.primary_color || '#1D9E75',
        secondary_color: tenant.secondary_color || '#378ADD',
        support_phone: tenant.support_phone,
        support_email: tenant.support_email,
        portal_template: tenant.portal_template || 'classic',
        portal_theme: tenant.portal_theme || 'light',
      },
      packages: pkgRows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/portal/login — validate voucher code ────────────────────────────
// Body: { code, slug, mac_address, nas_ip, link_orig }
router.post('/login', async (req, res) => {
  const db = req.app.locals.db;
  const { code, slug, mac_address, nas_ip, link_orig } = req.body;

  if (!code || !slug) return res.status(400).json({ error: 'code and slug required' });

  try {
    // Resolve tenant
    const tenantRows = await db.query(
      `SELECT id FROM tenants WHERE slug = $1`, [slug]
    );
    if (!tenantRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenant_id = tenantRows[0].id;

    // Validate voucher
    const vRows = await db.query(`
      SELECT v.*, p.name AS pkg_name, p.duration_hrs,
             p.download_mbps, p.upload_mbps, p.speed_mbps
      FROM vouchers v
      JOIN packages p ON p.id = v.package_id
      WHERE v.code = $1
        AND v.tenant_id = $2
        AND v.status IN ('unused', 'active')
        AND (v.expires_at IS NULL OR v.expires_at > NOW())
    `, [code.toUpperCase().trim(), tenant_id]);

    if (!vRows.length) {
      return res.status(401).json({ error: 'Invalid, used, or expired voucher code' });
    }

    const voucher = vRows[0];

    // Activate voucher if unused
    if (voucher.status === 'unused') {
      const expiresAt = voucher.duration_hrs
        ? new Date(Date.now() + voucher.duration_hrs * 3600000)
        : null;

      await db.query(`
        UPDATE vouchers
        SET status = 'active', activated_at = NOW(), expires_at = $1, customer_phone = $2
        WHERE id = $3
      `, [expiresAt, null, voucher.id]);
    }

    // Log hotspot session
    await db.query(`
      INSERT INTO hotspot_sessions
        (tenant_id, voucher_id, username, mac_address, nas_ip, site_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT DO NOTHING
    `, [tenant_id, voucher.id, code.toUpperCase().trim(),
        mac_address || null, nas_ip ? nas_ip : null, voucher.site_id || null]);

    // Build MikroTik hotspot redirect URL
    // MikroTik will POST username+password to its own /login page
    const hotspot_ip = nas_ip || '192.168.88.1';
    const redirect_url = `http://${hotspot_ip}/login?username=${encodeURIComponent(code.toUpperCase())}&password=${encodeURIComponent(code.toUpperCase())}${link_orig ? '&dst=' + encodeURIComponent(link_orig) : ''}`;

    res.json({
      ok: true,
      voucher_code: code.toUpperCase(),
      package_name: voucher.pkg_name,
      redirect_url,
      message: 'Voucher validated. Connecting...',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/portal/pay — initiate mobile money payment ─────────────────────
// Body: { package_id, phone, slug, mac_address, nas_ip }
router.post('/pay', async (req, res) => {
  const db    = req.app.locals.db;
  const redis = req.app.locals.redis;
  const { package_id, phone: rawPhone, slug, mac_address, nas_ip } = req.body;

  if (!package_id || !rawPhone || !slug) {
    return res.status(400).json({ error: 'package_id, phone and slug required' });
  }

  const phone = normalizePhone(rawPhone);

  try {
    // Resolve tenant
    const tenantRows = await db.query(
      `SELECT t.*, s.id AS first_site_id FROM tenants t
       LEFT JOIN sites s ON s.tenant_id = t.id
       WHERE t.slug = $1 LIMIT 1`, [slug]
    );
    if (!tenantRows.length) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tenantRows[0];

    // Load package
    const pkgRows = await db.query(
      `SELECT * FROM packages WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [package_id, tenant.id]
    );
    if (!pkgRows.length) return res.status(404).json({ error: 'Package not found' });
    const pkg = pkgRows[0];

    const provider = detectProvider(phone);
    const reference = makeRef();

    // Persist pending portal payment
    await db.query(`
      INSERT INTO portal_payments
        (tenant_id, site_id, package_id, phone, mac_address, amount_ugx, reference, provider)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [tenant.id, tenant.first_site_id, package_id, phone, mac_address || null,
        pkg.price_ugx, reference, provider]);

    // Initiate mobile money collection (non-blocking — status polled separately)
    initiateCollection({ db, redis, tenant, pkg, phone, provider, reference, mac_address, nas_ip })
      .catch(err => console.error('[Portal] MoMo init error:', err.message));

    res.json({
      ok: true,
      reference,
      provider,
      phone,
      amount_ugx: pkg.price_ugx,
      package_name: pkg.name,
      message: `Payment request sent to ${phone}. Approve on your phone.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/portal/pay/status/:reference — poll payment status ───────────────
router.get('/pay/status/:reference', async (req, res) => {
  const db = req.app.locals.db;
  const { reference } = req.params;

  try {
    const rows = await db.query(
      `SELECT pp.*, p.name AS pkg_name, p.duration_hrs
       FROM portal_payments pp
       JOIN packages p ON p.id = pp.package_id
       WHERE pp.reference = $1`,
      [reference]
    );
    if (!rows.length) return res.status(404).json({ error: 'Payment not found' });
    const pp = rows[0];

    if (pp.status === 'completed') {
      return res.json({
        status: 'completed',
        voucher_code: pp.voucher_code,
        package_name: pp.pkg_name,
        message: 'Payment successful! Connecting...',
      });
    }

    if (pp.status === 'failed') {
      return res.json({ status: 'failed', message: 'Payment failed. Please try again.' });
    }

    res.json({ status: 'pending', message: 'Waiting for payment confirmation...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── RADIUS Accounting webhook ─────────────────────────────────────────────────
// Called by FreeRADIUS exec module OR by a custom accounting listener.
// Alternatively, FreeRADIUS writes directly to radacct; this endpoint lets
// us update hotspot_sessions in real time.
// POST /api/portal/accounting
router.post('/accounting', async (req, res) => {
  const db = req.app.locals.db;
  const {
    acct_type,        // Start | Stop | Interim-Update
    username,
    acct_session_id,
    nas_ip,
    framed_ip,
    bytes_in,
    bytes_out,
    session_time,
    terminate_cause,
  } = req.body;

  try {
    if (acct_type === 'Start') {
      await db.query(`
        UPDATE hotspot_sessions
        SET acct_session_id = $1, ip_address = $2, nas_ip = $3
        WHERE username = $4 AND ended_at IS NULL
      `, [acct_session_id, framed_ip || null, nas_ip || null, username]);
    } else if (acct_type === 'Interim-Update') {
      await db.query(`
        UPDATE hotspot_sessions
        SET bytes_in = $1, bytes_out = $2
        WHERE username = $3 AND ended_at IS NULL
      `, [bytes_in || 0, bytes_out || 0, username]);
    } else if (acct_type === 'Stop') {
      await db.query(`
        UPDATE hotspot_sessions
        SET bytes_in = $1, bytes_out = $2, ended_at = NOW(), terminate_cause = $3
        WHERE username = $4 AND ended_at IS NULL
      `, [bytes_in || 0, bytes_out || 0, terminate_cause || '', username]);

      // Mark voucher as used if session ended normally
      await db.query(`
        UPDATE vouchers
        SET status = 'used'
        WHERE code = $1 AND status = 'active'
          AND (expires_at IS NULL OR expires_at < NOW() + INTERVAL '5 minutes')
      `, [username]);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Internal: initiate MoMo collection + complete on success ─────────────────
async function initiateCollection({ db, redis, tenant, pkg, phone, provider, reference, mac_address, nas_ip }) {
  try {
    let collected = false;

    if (provider === 'mtn') {
      const { collectMTN } = require('../payments/mtn.service');
      collected = await collectMTN(phone, pkg.price_ugx, `iCube WiFi: ${pkg.name} [${reference}]`);
    } else if (provider === 'airtel') {
      const { collectAirtel } = require('../payments/airtel.service');
      collected = await collectAirtel(phone, pkg.price_ugx, `iCube WiFi: ${pkg.name} [${reference}]`);
    }

    if (collected) {
      // Generate voucher
      const voucher = await generateVoucherCode(db, {
        package_id: pkg.id,
        site_id: null,
        tenant_id: tenant.id,
        source: 'portal_momo',
      });

      // Record payment
      await createPayment(db, {
        tenant_id: tenant.id,
        voucher_id: voucher.id,
        amount_ugx: pkg.price_ugx,
        method: provider,
        status: 'completed',
        source: 'momo',
        customer_phone: phone,
        voucher_code: voucher.code,
      });

      // Mark portal_payment completed
      await db.query(`
        UPDATE portal_payments
        SET status = 'completed', voucher_id = $1, voucher_code = $2, completed_at = NOW()
        WHERE reference = $3
      `, [voucher.id, voucher.code, reference]);

      // SMS backup code
      await sendSMS(phone,
        `Your iCube WiFi voucher: ${voucher.code}\n` +
        `Package: ${pkg.name}\n` +
        `If not auto-connected, enter this code on the WiFi page.`
      ).catch(() => {});

      await redis.del('ai:revenue_summary');
    } else {
      await db.query(
        `UPDATE portal_payments SET status = 'failed' WHERE reference = $1`, [reference]
      );
    }
  } catch (err) {
    console.error('[Portal] collection error:', err.message);
    await db.query(
      `UPDATE portal_payments SET status = 'failed' WHERE reference = $1`, [reference]
    ).catch(() => {});
  }
}

module.exports = router;
