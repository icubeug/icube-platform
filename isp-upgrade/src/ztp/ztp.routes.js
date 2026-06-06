// src/ztp/ztp.routes.js
// Zero-Touch Provisioning — no tenant middleware, authenticated via bearer tokens
const express = require('express');
const router  = express.Router();
const { detectRouterTier } = require('../routers/router-intelligence');

const SERVER_IP = process.env.PLATFORM_DOMAIN || 'web.icubeug.net';

function extractBearer(req) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return null;
}

// ── Shared script lookup helper ───────────────────────────────────────────────
async function lookupRouter(db, tenant_slug, install_token, bearer) {
  const rows = await db.query(`
    SELECT r.*, t.slug AS tenant_slug, t.name AS tenant_name
    FROM routers r JOIN tenants t ON t.id = r.tenant_id
    WHERE r.install_token = $1 AND t.slug = $2
  `, [install_token, tenant_slug]);
  if (!rows.length) return { err: 404, msg: '# Error: Router not found or invalid token.\n' };
  const r = rows[0];
  if (bearer && r.bearer_token !== bearer) return { err: 403, msg: '# Error: Invalid bearer token.\n' };
  return { r };
}

// ── Script delivery ────────────────────────────────────────────────────────────
// GET /api/v1/router/:tenant_slug/scripts/radius/:install_token
router.get('/:tenant_slug/scripts/radius/:install_token', async (req, res) => {
  const { tenant_slug, install_token } = req.params;
  const bearer = extractBearer(req);
  const { r, err, msg } = await lookupRouter(req.app.locals.db, tenant_slug, install_token, bearer);
  if (err) return res.status(err).type('text/plain').send(msg);
  res.type('text/plain')
     .setHeader('Content-Disposition', `attachment; filename="icube-radius-${r.name.replace(/\s+/g, '-')}.rsc"`)
     .send(buildRadiusScript(r));
});

// GET /api/v1/router/:tenant_slug/scripts/vpn/:install_token
router.get('/:tenant_slug/scripts/vpn/:install_token', async (req, res) => {
  const { tenant_slug, install_token } = req.params;
  const bearer = extractBearer(req);
  const { r, err, msg } = await lookupRouter(req.app.locals.db, tenant_slug, install_token, bearer);
  if (err) return res.status(err).type('text/plain').send(msg);
  res.type('text/plain')
     .setHeader('Content-Disposition', `attachment; filename="icube-vpn-${r.name.replace(/\s+/g, '-')}.rsc"`)
     .send(buildVPNScript(r));
});

// GET /api/v1/router/:tenant_slug/scripts/full/:install_token
router.get('/:tenant_slug/scripts/full/:install_token', async (req, res) => {
  const db = req.app.locals.db;
  const { tenant_slug, install_token } = req.params;
  const bearer = extractBearer(req);

  try {
    const { r, err: lookupErr, msg } = await lookupRouter(db, tenant_slug, install_token, bearer);
    if (lookupErr) return res.status(lookupErr).type('text/plain').send(msg);
    res.type('text/plain')
       .setHeader('Content-Disposition', `attachment; filename="icube-setup-${r.name.replace(/\s+/g, '-')}.rsc"`)
       .send(buildZTPScript(r));
  } catch (err) {
    console.error('[ZTP] script error:', err.message);
    res.status(500).type('text/plain').send(`# Error: ${err.message}\n`);
  }
});

// ── Register ───────────────────────────────────────────────────────────────────
// POST /api/v1/router/register
router.post('/register', async (req, res) => {
  const db     = req.app.locals.db;
  const bearer = extractBearer(req);
  if (!bearer) return res.status(401).json({ error: 'Authorization: Bearer <token> required' });

  const { identity, model, serial, ros_version, wan_ip } = req.body;

  try {
    const rows = await db.query(
      `SELECT * FROM routers WHERE bearer_token = $1`, [bearer]
    );
    if (!rows.length) return res.status(403).json({ error: 'Invalid bearer token' });
    const r    = rows[0];
    const tier = detectRouterTier(model || r.model_name);

    await db.query(`
      UPDATE routers SET
        status             = 'online',
        vpn_connected      = true,
        last_heartbeat_at  = NOW(),
        install_token_used = true,
        model_name         = COALESCE($2, model_name),
        serial_number      = COALESCE($3, serial_number),
        ros_version        = COALESCE($4, ros_version),
        wan_ip             = COALESCE($5::inet, wan_ip),
        subnet_prefix      = $6,
        subnet_mask        = $7,
        network_address    = $8,
        gateway_ip         = $9,
        dhcp_pool_start    = $10,
        dhcp_pool_end      = $11,
        max_users          = $12,
        recommended_users  = $13,
        tier_name          = $14
      WHERE id = $1
    `, [r.id, model||null, serial||null, ros_version||null, wan_ip||null,
        tier.subnet_prefix, tier.subnet_mask, tier.network, tier.gateway,
        tier.pool_start, tier.pool_end, tier.max_users, tier.recommended_users, tier.tier_name]);

    const [tenant] = await db.query(`SELECT slug FROM tenants WHERE id = $1`, [r.tenant_id]);

    console.log(`[ZTP] Router registered: ${r.name} (${model || 'unknown'}) tenant=${tenant?.slug}`);

    res.json({ success: true, radius_secret: r.radius_secret, tenant_slug: tenant?.slug, tier: tier.tier_name });
  } catch (err) {
    console.error('[ZTP] register error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Heartbeat (bearer-token version) ──────────────────────────────────────────
// POST /api/v1/router/heartbeat
router.post('/heartbeat', async (req, res) => {
  const db     = req.app.locals.db;
  const bearer = extractBearer(req);

  // Also accept token in body for backward compat
  const { token, vpn_username, cpu_load, memory_used, active_users, wan_ip, uptime } = req.body;
  const authToken = bearer || token;

  try {
    let routerRow;

    if (authToken?.startsWith('icube_')) {
      const rows = await db.query(`
        UPDATE routers SET
          vpn_connected     = true,
          last_heartbeat_at = NOW(),
          status            = 'online',
          cpu_load          = COALESCE($2, cpu_load),
          memory_used       = COALESCE($3, memory_used),
          active_users      = COALESCE($4, active_users),
          wan_ip            = COALESCE($5::inet, wan_ip)
        WHERE bearer_token = $1
        RETURNING id, tenant_id, name, max_users, active_users, last_capacity_alert_at
      `, [authToken, cpu_load??null, memory_used??null, active_users??null, wan_ip||null]);

      if (!rows.length) return res.status(403).json({ error: 'Invalid bearer token' });
      routerRow = rows[0];
    } else if (vpn_username || token) {
      const { handleHeartbeat } = require('../vpn/vpn.service');
      routerRow = await handleHeartbeat(db, req.body);
    } else {
      return res.status(400).json({ error: 'Authorization required' });
    }

    // Insert heartbeat record
    await db.query(`
      INSERT INTO router_heartbeats
        (router_id, tenant_id, cpu_load, memory_used, active_users, wan_ip)
      VALUES ($1, $2, $3, $4, $5, $6::inet)
    `, [routerRow.id, routerRow.tenant_id, cpu_load??null, memory_used??null, active_users??null, wan_ip||null]).catch(()=>{});

    // Prune heartbeats older than 24h
    await db.query(
      `DELETE FROM router_heartbeats WHERE router_id=$1 AND recorded_at < NOW() - INTERVAL '24 hours'`,
      [routerRow.id]
    ).catch(()=>{});

    // Capacity alert check
    const maxU = parseInt(routerRow.max_users, 10) || 200;
    const curU = parseInt(routerRow.active_users, 10) || 0;
    if (maxU > 0 && curU / maxU >= 0.85) {
      const lastAlert = routerRow.last_capacity_alert_at;
      const cooldownOk = !lastAlert || (Date.now() - new Date(lastAlert).getTime()) > 3600_000;
      if (cooldownOk) {
        const { sendCapacityAlertEmail } = require('../notifications/email.service');
        const [tRow] = await db.query(
          `SELECT t.owner_email, t.name FROM tenants t WHERE t.id = $1`, [routerRow.tenant_id]
        ).catch(() => [null]);
        if (tRow?.owner_email) {
          sendCapacityAlertEmail({
            to: tRow.owner_email, tenantName: tRow.name, routerName: routerRow.name,
            curUsers: curU, maxUsers: maxU, pct: Math.round(curU / maxU * 100),
          }).catch(()=>{});
        }
        await db.query(`UPDATE routers SET last_capacity_alert_at=NOW() WHERE id=$1`, [routerRow.id]).catch(()=>{});
      }
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── ZTP Script builder ─────────────────────────────────────────────────────────
function buildZTPScript(r) {
  const vpnPort      = r.vpn_port      || 51820;
  const privateKey   = r.wireguard_private_key || '[PRIVATE_KEY_MISSING]';
  const serverPubKey = process.env.WG_SERVER_PUBLIC_KEY || '[SERVER_PUBLIC_KEY]';
  const peerIp       = r.wireguard_peer_ip || '10.99.0.2';
  const gateway      = r.gateway_ip     || '192.168.1.1';
  const prefix       = r.subnet_prefix  || 24;
  const network      = r.network_address || '192.168.1.0';
  const poolStart    = r.dhcp_pool_start || '192.168.1.2';
  const poolEnd      = r.dhcp_pool_end   || '192.168.1.254';
  const bearer       = r.bearer_token;
  const tenantSlug   = r.tenant_slug   || 'default';
  const tenantName   = r.tenant_name   || 'iCube ISP';
  const now          = new Date().toISOString();

  return `# ============================================
# iCube Zero Touch Provisioning Script
# Tenant: ${tenantName}
# Router: ${r.name}
# Generated: ${now}
# Version: 2.0
# ============================================

# Check RouterOS version
:local rosver [/system resource get version]
:log info "iCube ZTP Starting - RouterOS $rosver"

# Set identity
/system identity set name="${r.name}"
/system clock set time-zone-name=Africa/Kampala
/system ntp client set enabled=yes server-dns-name=time.google.com

# ============================================
# WIREGUARD VPN
# ============================================
/interface wireguard add name=icube-vpn \\
  private-key="${privateKey}" \\
  listen-port=13231 \\
  comment="iCube VPN v2"

/interface wireguard peers add \\
  interface=icube-vpn \\
  public-key="${serverPubKey}" \\
  endpoint-address=vpn.icubeug.net \\
  endpoint-port=${vpnPort} \\
  allowed-address=10.99.0.0/24,${SERVER_IP}/32 \\
  persistent-keepalive=25

/ip address add \\
  address=${peerIp}/24 \\
  interface=icube-vpn \\
  comment="iCube VPN IP"

/ip route add \\
  dst-address=${SERVER_IP}/32 \\
  gateway=${peerIp} \\
  distance=1 \\
  comment="iCube Server"

# ============================================
# DHCP & NETWORK
# ============================================
/ip pool add name=icube-pool ranges=${poolStart}-${poolEnd}

/ip dhcp-server add \\
  name=icube-dhcp \\
  interface=bridge \\
  address-pool=icube-pool \\
  lease-time=1h \\
  disabled=no

/ip dhcp-server network add \\
  address=${network}/${prefix} \\
  gateway=${gateway} \\
  dns-server=8.8.8.8,8.8.4.4

/ip address add \\
  address=${gateway}/${prefix} \\
  interface=bridge \\
  comment="iCube LAN"

/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes

/ip firewall nat add \\
  chain=srcnat \\
  out-interface=ether1 \\
  action=masquerade \\
  comment="iCube NAT"

# ============================================
# RADIUS
# ============================================
/radius add \\
  service=hotspot,login \\
  address=${SERVER_IP} \\
  secret="${r.radius_secret}" \\
  authentication-port=1812 \\
  accounting-port=1813 \\
  timeout=3000 \\
  comment="iCube RADIUS"

/radius incoming add accept=yes port=3799

# ============================================
# HOTSPOT
# ============================================
/ip hotspot profile add \\
  name=icube-profile \\
  hotspot-address=${gateway} \\
  use-radius=yes \\
  radius-accounting=yes \\
  login-by=http-chap,http-pap,mac-cookie \\
  mac-auth-mode=mac-as-username \\
  nas-port-type=wireless-802.11 \\
  login-page=http://${SERVER_IP}/portal/${tenantSlug}

/ip hotspot add \\
  name=icube-hotspot \\
  interface=bridge \\
  profile=icube-profile \\
  address-pool=icube-pool \\
  disabled=no

/ip hotspot walled-garden add dst-host=${SERVER_IP}
/ip hotspot walled-garden add dst-host="*.icubeug.net"
/ip hotspot walled-garden ip add dst-address=${SERVER_IP}/32 action=accept

# ============================================
# API ACCESS
# ============================================
/ip service set api \\
  address=10.99.0.0/24,${SERVER_IP}/32 \\
  disabled=no \\
  port=8728

/ip service disable telnet,ftp,www,ssh

# ============================================
# REGISTER WITH ICUBE
# ============================================
:local identity [/system identity get name]
:local model [/system resource get board-name]
:local serial [/system routerboard get serial-number]
:local rosver2 [/system resource get version]

/tool fetch \\
  url="https://${SERVER_IP}/api/v1/router/register" \\
  http-method=post \\
  http-header-field="Authorization: Bearer ${bearer}\\r\\nContent-Type: application/json" \\
  http-data="{\\"identity\\":\\"$identity\\",\\"model\\":\\"$model\\",\\"serial\\":\\"$serial\\",\\"ros_version\\":\\"$rosver2\\"}" \\
  output=none

# ============================================
# HEARTBEAT SCHEDULER
# ============================================
/system scheduler add \\
  name=icube-heartbeat \\
  interval=5m \\
  on-event=":local cpu [/system resource get cpu-load];:local mem [/system resource get free-memory];:local totalmem [/system resource get total-memory];:local mempct (100*(\$totalmem-\$mem)/\$totalmem);:local users [/ip hotspot active print count-only];:local uptime [/system resource get uptime];/tool fetch url=\\"https://${SERVER_IP}/api/v1/router/heartbeat\\" http-method=post http-header-field=\\"Authorization: Bearer ${bearer}\\\\r\\\\nContent-Type: application/json\\" http-data=\\"{\\\\\\"cpu_load\\\\\\":$cpu,\\\\\\"memory_used\\\\\\":$mempct,\\\\\\"active_users\\\\\\":$users,\\\\\\"uptime\\\\\\":\\\\\\"$uptime\\\\\\"}\\" output=none" \\
  comment="iCube Heartbeat"

:log info "iCube ZTP Complete - Router registered successfully"

# ============================================
# END OF ICUBE ZTP SCRIPT
# Tenant: ${tenantName} | Router: ${r.name}
# Support: support@icubeug.net
# ============================================
`;
}

// ── Partial: RADIUS only ──────────────────────────────────────────────────────
function buildRadiusScript(r) {
  const bearer = r.bearer_token;
  const now    = new Date().toISOString();
  return `# ============================================
# iCube RADIUS Configuration
# Router: ${r.name}  Generated: ${now}
# ============================================

/radius add \\
  service=hotspot,login \\
  address=${SERVER_IP} \\
  secret="${r.radius_secret}" \\
  authentication-port=1812 \\
  accounting-port=1813 \\
  timeout=3000 \\
  comment="iCube RADIUS"

/radius incoming add accept=yes port=3799

/ip hotspot walled-garden add dst-host=${SERVER_IP}
/ip hotspot walled-garden ip add dst-address=${SERVER_IP}/32 action=accept

:local identity [/system identity get name]
/tool fetch \\
  url="https://${SERVER_IP}/api/v1/router/register" \\
  http-method=post \\
  http-header-field="Authorization: Bearer ${bearer}\\r\\nContent-Type: application/json" \\
  http-data="{\\"identity\\":\\"$identity\\"}" \\
  output=none

:log info "iCube RADIUS configured for ${r.name}"
`;
}

// ── Partial: VPN only ─────────────────────────────────────────────────────────
function buildVPNScript(r) {
  const vpnPort      = r.vpn_port      || 51820;
  const privateKey   = r.wireguard_private_key || '[PRIVATE_KEY_MISSING]';
  const serverPubKey = process.env.WG_SERVER_PUBLIC_KEY || '[SERVER_PUBLIC_KEY]';
  const peerIp       = r.wireguard_peer_ip || '10.99.0.2';
  const bearer       = r.bearer_token;
  const now          = new Date().toISOString();
  return `# ============================================
# iCube WireGuard VPN Configuration
# Router: ${r.name}  Port: ${vpnPort}  Generated: ${now}
# ============================================

/interface wireguard add name=icube-vpn \\
  private-key="${privateKey}" \\
  listen-port=13231 \\
  comment="iCube VPN v2"

/interface wireguard peers add \\
  interface=icube-vpn \\
  public-key="${serverPubKey}" \\
  endpoint-address=vpn.icubeug.net \\
  endpoint-port=${vpnPort} \\
  allowed-address=10.99.0.0/24,${SERVER_IP}/32 \\
  persistent-keepalive=25

/ip address add \\
  address=${peerIp}/24 \\
  interface=icube-vpn \\
  comment="iCube VPN IP"

/ip route add \\
  dst-address=${SERVER_IP}/32 \\
  gateway=${peerIp} \\
  distance=1 \\
  comment="iCube Server"

:local identity [/system identity get name]
/tool fetch \\
  url="https://${SERVER_IP}/api/v1/router/register" \\
  http-method=post \\
  http-header-field="Authorization: Bearer ${bearer}\\r\\nContent-Type: application/json" \\
  http-data="{\\"identity\\":\\"$identity\\"}" \\
  output=none

:log info "iCube VPN configured for ${r.name} — ${peerIp}"
`;
}

// ── Captive portal template script ────────────────────────────────────────────
// POST /api/v1/router/:tenant_slug/scripts/captive
// Bearer-token authenticated; body: { variation, theme }
router.post('/:tenant_slug/scripts/captive', async (req, res) => {
  const db = req.app.locals.db;
  const { tenant_slug } = req.params;
  const bearer = extractBearer(req);
  const { variation = 'classic', theme = 'light' } = req.body || {};

  try {
    // Authenticate with bearer token (any router of this tenant)
    const [router] = await db.query(`
      SELECT r.*, t.slug, t.name AS tenant_name
      FROM routers r
      JOIN tenants t ON t.id = r.tenant_id
      WHERE t.slug = $1 AND r.bearer_token = $2
      LIMIT 1
    `, [tenant_slug, bearer]);

    if (!router) return res.status(401).type('text/plain').send('# Unauthorized: invalid token');

    const portalUrl = `https://web.icubeug.net/portal/${tenant_slug}?template=${variation}&theme=${theme}`;
    const profileName = 'iCube-Hotspot';

    const script = `# iCube Captive Portal Template Installation
# Template: ${variation}  Theme: ${theme}
# Generated: ${new Date().toISOString()}

:log info "Installing iCube captive portal template: ${variation} (${theme})"

# Download captive portal page from iCube
/tool fetch url="${portalUrl}&format=html" dst-path="icube-login.html" mode=https

# Set the login page on the hotspot profile
/ip hotspot profile set [find name="${profileName}"] login-by=http-pap html-directory=hotspot

# Copy the login page into the hotspot directory
/file move icube-login.html hotspot/login.html

:delay 1s

:log info "iCube captive portal (${variation}/${theme}) installed successfully"
:put "Template installed. Hotspot login page updated."
`;

    res.type('text/plain')
       .setHeader('Content-Disposition', `attachment; filename="icube-captive-${variation}-${theme}.rsc"`)
       .send(script);

    // Persist the template selection to tenant_branding
    await db.query(`
      INSERT INTO tenant_branding (tenant_id, portal_template, portal_theme)
      VALUES ($1, $2, $3)
      ON CONFLICT (tenant_id) DO UPDATE
        SET portal_template = EXCLUDED.portal_template,
            portal_theme    = EXCLUDED.portal_theme
    `, [router.tenant_id, variation, theme]).catch(() => {});
  } catch (err) {
    res.status(500).type('text/plain').send(`# Error: ${err.message}`);
  }
});

module.exports = router;
