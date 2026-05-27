// src/multirouter/router.routes.js
const express = require('express');
const router  = express.Router();
const { handleHeartbeat, generateMikrotikScript } = require('../vpn/vpn.service');

// POST /api/v1/routers/heartbeat — called by MikroTik scheduler (no tenant auth)
router.post('/heartbeat', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const result = await handleHeartbeat(db, req.body);
    res.json({ ok: true, router: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/v1/routers
router.get('/', async (req, res) => {
  const tid = req.tenant?.id;
  try {
    const rows = await req.app.locals.db.query(`
      SELECT r.*, s.name AS site_name
      FROM routers r
      LEFT JOIN sites s ON s.id = r.site_id
      WHERE r.tenant_id = $1 OR $1 IS NULL
      ORDER BY r.created_at DESC
    `, [tid || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/routers/:id
router.get('/:id', async (req, res) => {
  try {
    const rows = await req.app.locals.db.query(
      'SELECT * FROM routers WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Router not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/routers
router.post('/', async (req, res) => {
  const { name, ip_address, api_port, api_username, api_password, site_id, brand } = req.body;
  if (!name || !ip_address) return res.status(400).json({ error: 'name and ip_address required' });
  try {
    const rows = await req.app.locals.db.query(`
      INSERT INTO routers (name, ip_address, api_port, api_username, api_password, site_id, brand, tenant_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `, [name, ip_address, api_port || 8728, api_username, api_password, site_id, brand || 'mikrotik', req.tenant_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/routers/:id/metrics — time-series metrics for charts
router.get('/:id/metrics', async (req, res) => {
  const db  = req.app.locals.db;
  const { range = '1h' } = req.query;
  const intervalMap = { '1h': '1 hour', '3h': '3 hours', '6h': '6 hours', '24h': '24 hours' };
  const interval = intervalMap[range] || '1 hour';
  try {
    const router = await db.query(`SELECT * FROM routers WHERE id = $1`, [req.params.id]);
    if (!router.length) return res.status(404).json({ error: 'Router not found' });

    const metrics = await db.query(`
      SELECT cpu_load, memory_usage, active_users, bytes_in, bytes_out,
             TO_CHAR(recorded_at, 'HH24:MI') AS time_label,
             recorded_at
      FROM router_metrics
      WHERE router_id = $1 AND recorded_at > NOW() - INTERVAL '${interval}'
      ORDER BY recorded_at ASC
    `, [req.params.id]);

    // If no real data, generate mock
    let series = metrics;
    if (!series.length) {
      const points = 12;
      series = Array.from({ length: points }, (_, i) => ({
        time_label: `${String(new Date().getHours()).padStart(2,'0')}:${String(i * 5).padStart(2,'0')}`,
        cpu_load:    (20 + Math.random() * 50).toFixed(1),
        memory_usage:(40 + Math.random() * 30).toFixed(1),
        active_users: Math.floor(10 + Math.random() * 40),
        bytes_in:    Math.floor(Math.random() * 5000000),
        bytes_out:   Math.floor(Math.random() * 2000000),
      }));
    }

    const r = router[0];
    const latest = series[series.length - 1] || {};

    res.json({
      router: {
        id: r.id, name: r.name, status: r.status,
        uptime_seconds: r.uptime_seconds || 120133,
        board_name: r.board_name || 'RB4011iGS',
        firmware_version: r.firmware_version || '7.14.2',
      },
      stats: {
        uptime:       formatUptime(r.uptime_seconds || 120133),
        active_users: latest.active_users || 23,
        cpu_load:     parseFloat(latest.cpu_load) || 24,
        memory_usage: parseFloat(latest.memory_usage) || 56,
      },
      series,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/v1/routers/:id
router.patch('/:id', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant.id;
  const { name, ip_address, api_port, api_username, api_password, site_id, brand, ssh_port } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    const map = { name, ip_address, api_port, api_username, api_password, site_id, brand, ssh_port };
    for (const [k, v] of Object.entries(map)) {
      if (v !== undefined) { fields.push(`${k} = $${i++}`); values.push(v); }
    }
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
    values.push(req.params.id, tid);
    const rows = await db.query(
      `UPDATE routers SET ${fields.join(', ')} WHERE id = $${i} AND tenant_id = $${i+1} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Router not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/v1/routers/:id/setup — get setup config + generated script
router.get('/:id/setup', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant?.id;
  try {
    const [r] = await db.query(
      `SELECT * FROM routers WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]
    );
    if (!r) return res.status(404).json({ error: 'Router not found' });

    let config = {};
    const cfgRows = await db.query(
      `SELECT * FROM router_setup_configs WHERE router_id=$1`, [req.params.id]
    );
    if (cfgRows.length) config = cfgRows[0];

    // Fetch platform settings
    const psRows = await db.query(`SELECT key, value FROM platform_settings`);
    const platformSettings = {};
    psRows.forEach(p => { platformSettings[p.key] = p.value; });

    const script = config.generated_script || generateMikrotikScript({ router: r, config, platformSettings, tenantName: null });

    res.json({ router: r, config, script });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/routers/:id/setup — save config + regenerate script
router.post('/:id/setup', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant?.id;
  const {
    wan_interface, lan_interface, hotspot_network, dns_servers,
    // Network overrides from tier selection
    gateway, pool_start, pool_end, network_cidr, network_mask,
    // Model + tier metadata
    model, tier, tenant_name,
  } = req.body;
  try {
    // Also resolve tenant name if not passed
    let resolvedTenantName = tenant_name;
    if (!resolvedTenantName && tid) {
      const tRows = await db.query(`SELECT name FROM tenants WHERE id=$1`, [tid]);
      resolvedTenantName = tRows[0]?.name || 'iCube ISP';
    }

    // Fetch router (allow null tenant for test environments)
    let rRows;
    if (tid) {
      rRows = await db.query(`SELECT * FROM routers WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]);
    } else {
      rRows = await db.query(`SELECT * FROM routers WHERE id=$1`, [req.params.id]);
    }
    const r = rRows[0];
    if (!r) return res.status(404).json({ error: 'Router not found' });

    const psRows = await db.query(`SELECT key, value FROM platform_settings`);
    const platformSettings = {};
    psRows.forEach(p => { platformSettings[p.key] = p.value; });

    const config = {
      wan_interface, lan_interface, hotspot_network, dns_servers,
      gateway, pool_start, pool_end, network_cidr, network_mask,
    };
    const script = generateMikrotikScript({
      router: r, config, platformSettings,
      model, tier, tenantName: resolvedTenantName,
    });

    const [cfg] = await db.query(`
      INSERT INTO router_setup_configs
        (router_id, wan_interface, lan_interface, hotspot_network, dns_servers, generated_script)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (router_id) DO UPDATE SET
        wan_interface   = EXCLUDED.wan_interface,
        lan_interface   = EXCLUDED.lan_interface,
        hotspot_network = EXCLUDED.hotspot_network,
        dns_servers     = EXCLUDED.dns_servers,
        generated_script = EXCLUDED.generated_script
      RETURNING *
    `, [req.params.id, wan_interface || 'ether1', lan_interface || 'ether2',
        hotspot_network || '192.168.88.0/24', dns_servers || '8.8.8.8,8.8.4.4', script]);

    // Auto-generate VPN creds if missing
    if (!r.vpn_username) {
      await db.query(`
        UPDATE routers SET
          vpn_username = 'router-' || SUBSTRING(id::text,1,8),
          vpn_password = MD5(id::text || 'icube-vpn-salt') || SUBSTRING(MD5(RANDOM()::text),1,8),
          radius_secret = MD5(id::text || 'icube-radius-salt-' || created_at::text)
        WHERE id = $1
      `, [req.params.id]);
    }

    res.json({ config: cfg, script });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/routers/:id/setup/complete
router.patch('/:id/setup/complete', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant?.id;
  try {
    await db.query(
      `UPDATE routers SET setup_completed=true WHERE id=$1 AND tenant_id=$2`,
      [req.params.id, tid]
    );
    await db.query(
      `UPDATE router_setup_configs SET setup_completed_at=NOW() WHERE router_id=$1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/routers/:id/test-connection
router.get('/:id/test-connection', async (req, res) => {
  const db  = req.app.locals.db;
  const tid = req.tenant?.id;
  try {
    const [r] = await db.query(
      `SELECT * FROM routers WHERE id=$1 AND tenant_id=$2`, [req.params.id, tid]
    );
    if (!r) return res.status(404).json({ error: 'Router not found' });

    // Simulate connection test (in production, try SSH/API)
    const online = r.vpn_connected || false;
    const latency = online ? Math.floor(5 + Math.random() * 20) : null;
    res.json({
      reachable: online,
      latency_ms: latency,
      vpn_connected: r.vpn_connected,
      last_heartbeat_at: r.last_heartbeat_at,
      message: online ? 'Router is online and VPN tunnel is active' : 'Router not reachable — VPN tunnel inactive',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${d}d${h}h${m}m${s}s`;
}

module.exports = router;
