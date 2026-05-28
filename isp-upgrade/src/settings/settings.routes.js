// src/settings/settings.routes.js
const express = require('express');
const router  = express.Router();

// GET /api/v1/settings/general
router.get('/general', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    let rows = await db.query(`SELECT * FROM hotspot_settings WHERE tenant_id = $1`, [tid]);
    if (!rows.length) {
      // auto-create defaults
      rows = await db.query(`
        INSERT INTO hotspot_settings (tenant_id) VALUES ($1) RETURNING *
      `, [tid]);
    }
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/v1/settings/general
router.put('/general', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { dns_url, support_phone_1, support_phone_2, login_page_name, footer_note } = req.body;
  try {
    const [row] = await db.query(`
      INSERT INTO hotspot_settings
        (tenant_id, dns_url, support_phone_1, support_phone_2, login_page_name, footer_note, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        dns_url         = COALESCE(EXCLUDED.dns_url,         hotspot_settings.dns_url),
        support_phone_1 = COALESCE(EXCLUDED.support_phone_1, hotspot_settings.support_phone_1),
        support_phone_2 = COALESCE(EXCLUDED.support_phone_2, hotspot_settings.support_phone_2),
        login_page_name = COALESCE(EXCLUDED.login_page_name, hotspot_settings.login_page_name),
        footer_note     = COALESCE(EXCLUDED.footer_note,     hotspot_settings.footer_note),
        updated_at      = NOW()
      RETURNING *
    `, [tid, dns_url, support_phone_1, support_phone_2, login_page_name, footer_note]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/settings/sms
router.get('/sms', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    let rows = await db.query(`SELECT * FROM sms_settings WHERE tenant_id = $1`, [tid]);
    if (!rows.length) {
      rows = await db.query(`INSERT INTO sms_settings (tenant_id) VALUES ($1) RETURNING *`, [tid]);
    }
    // Mock balance
    res.json({ ...rows[0], account_credit: 45000, per_sms_rate: 35 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/v1/settings/sms
router.put('/sms', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { agent_sales_sms, realtime_momo_sms, delayed_reminder_minutes } = req.body;
  try {
    const [row] = await db.query(`
      INSERT INTO sms_settings (tenant_id, agent_sales_sms, realtime_momo_sms, delayed_reminder_minutes, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
        agent_sales_sms          = COALESCE(EXCLUDED.agent_sales_sms,          sms_settings.agent_sales_sms),
        realtime_momo_sms        = COALESCE(EXCLUDED.realtime_momo_sms,        sms_settings.realtime_momo_sms),
        delayed_reminder_minutes = COALESCE(EXCLUDED.delayed_reminder_minutes, sms_settings.delayed_reminder_minutes),
        updated_at = NOW()
      RETURNING *
    `, [tid, agent_sales_sms, realtime_momo_sms, delayed_reminder_minutes]);
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/settings/routers  — alias for the main routers list (tenant-scoped)
router.get('/routers', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const rows = await db.query(`
      SELECT r.*, s.name AS site_name
      FROM routers r
      LEFT JOIN sites s ON s.id = r.site_id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC
    `, [tid]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/settings/routers
router.post('/routers', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { name, ip_address, brand = 'mikrotik', api_username, api_password, ssh_port, site_id } = req.body;
  if (!name || !ip_address) return res.status(400).json({ error: 'name and ip_address required' });
  try {
    const [row] = await db.query(`
      INSERT INTO routers (tenant_id, site_id, name, ip_address, brand, api_username, api_password, ssh_port)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [tid, site_id || null, name, ip_address, brand, api_username, api_password, ssh_port || 22]);
    res.status(201).json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/v1/settings/routers/:id
router.delete('/routers/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    await db.query(`DELETE FROM routers WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/settings/tenant-credentials — slug + api_token + latest router tokens
router.get('/tenant-credentials', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const [tenant] = await db.query(
      `SELECT slug, api_token FROM tenants WHERE id = $1`, [tid]
    );
    const [latest] = await db.query(`
      SELECT id, name, bearer_token, install_token, install_token_used
      FROM routers WHERE tenant_id = $1
      ORDER BY created_at DESC LIMIT 1
    `, [tid]);
    res.json({
      slug:          tenant?.slug          || '',
      api_token:     tenant?.api_token     || null,
      latest_router: latest || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/settings/api-credentials
router.get('/api-credentials', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  try {
    const [t] = await db.query(`SELECT slug, api_token FROM tenants WHERE id = $1`, [tid]);
    const tok = t?.api_token || null;
    res.json({
      tenant_slug:        t?.slug || '',
      api_token_prefix:   tok ? tok.slice(0, 12) + '…' : null,
      api_token_full:     tok,
      has_token:          !!tok,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/v1/settings/api-credentials/regenerate
router.post('/api-credentials/regenerate', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const crypto = require('crypto');
  const newToken = 'icube_' + crypto.randomBytes(32).toString('hex');
  try {
    await db.query(`UPDATE tenants SET api_token = $1 WHERE id = $2`, [newToken, tid]);
    res.json({ api_token: newToken });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
