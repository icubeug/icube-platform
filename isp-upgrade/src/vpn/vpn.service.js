// src/vpn/vpn.service.js — VPN heartbeat + MikroTik script generation

const HEARTBEAT_TIMEOUT_SECONDS = 300; // 5 minutes — matches 5m scheduler
const CAPACITY_ALERT_THRESHOLD  = 0.85;
const CAPACITY_ALERT_COOLDOWN   = 3600; // 1 hour between alerts

// ── Token or username based heartbeat ─────────────────────────────────────────
async function handleHeartbeat(db, body) {
  const { token, vpn_username, cpu_load, memory_used, active_users, wan_ip } = body;

  let router;

  if (token) {
    const rows = await db.query(
      `UPDATE routers SET
         vpn_connected      = true,
         last_heartbeat_at  = NOW(),
         cpu_load           = COALESCE($2, cpu_load),
         memory_used        = COALESCE($3, memory_used),
         active_users       = COALESCE($4, active_users),
         wan_ip             = COALESCE($5::inet, wan_ip),
         status             = 'online'
       WHERE router_token = $1
       RETURNING id, tenant_id, name, router_token, vpn_address, max_users, active_users, last_capacity_alert_at`,
      [token, cpu_load ?? null, memory_used ?? null, active_users ?? null, wan_ip || null]
    );
    if (!rows.length) throw new Error('Router not found for token: ' + token);
    router = rows[0];
  } else if (vpn_username) {
    const rows = await db.query(
      `UPDATE routers SET
         vpn_connected      = true,
         last_heartbeat_at  = NOW(),
         cpu_load           = COALESCE($2, cpu_load),
         memory_used        = COALESCE($3, memory_used),
         active_users       = COALESCE($4, active_users),
         status             = 'online'
       WHERE vpn_username = $1
       RETURNING id, tenant_id, name, router_token, vpn_address, max_users, active_users, last_capacity_alert_at`,
      [vpn_username, cpu_load ?? null, memory_used ?? null, active_users ?? null]
    );
    if (!rows.length) throw new Error('Router not found for vpn_username: ' + vpn_username);
    router = rows[0];
  } else {
    throw new Error('token or vpn_username required');
  }

  // Insert heartbeat record
  await db.query(`
    INSERT INTO router_heartbeats
      (router_id, tenant_id, cpu_load, memory_used, active_users, wan_ip, recorded_at)
    VALUES ($1, $2, $3, $4, $5, $6::inet, NOW())
  `, [router.id, router.tenant_id, cpu_load ?? null, memory_used ?? null, active_users ?? null, wan_ip || null]).catch(() => {});

  // Prune heartbeats older than 24h
  await db.query(
    `DELETE FROM router_heartbeats WHERE router_id = $1 AND recorded_at < NOW() - INTERVAL '24 hours'`,
    [router.id]
  ).catch(() => {});

  // Capacity alert check
  const maxUsers = parseInt(router.max_users, 10) || 200;
  const curUsers = parseInt(router.active_users, 10) || 0;
  const pct      = maxUsers > 0 ? curUsers / maxUsers : 0;

  if (pct >= CAPACITY_ALERT_THRESHOLD) {
    const lastAlert = router.last_capacity_alert_at;
    const cooldownOk = !lastAlert ||
      (Date.now() - new Date(lastAlert).getTime()) > CAPACITY_ALERT_COOLDOWN * 1000;

    if (cooldownOk) {
      await sendCapacityAlert(db, router, curUsers, maxUsers, pct);
      await db.query(
        `UPDATE routers SET last_capacity_alert_at = NOW() WHERE id = $1`,
        [router.id]
      ).catch(() => {});
    }
  }

  return router;
}

async function sendCapacityAlert(db, router, curUsers, maxUsers, pct) {
  try {
    // Get tenant + site info
    const [tenantRow] = await db.query(
      `SELECT t.owner_email, t.name AS tenant_name, s.name AS site_name
       FROM tenants t
       LEFT JOIN sites s ON s.id = (SELECT site_id FROM routers WHERE id = $2)
       WHERE t.id = $1`,
      [router.tenant_id, router.id]
    );

    // Log to support_notes
    await db.query(`
      INSERT INTO support_notes (tenant_id, author_id, note)
      VALUES ($1, NULL, $2)
    `, [router.tenant_id,
      `⚠ Capacity alert: ${router.name} at ${Math.round(pct * 100)}% capacity (${curUsers}/${maxUsers} users)`
    ]).catch(() => {});

    // Email alert
    if (tenantRow?.owner_email) {
      const { sendCapacityAlertEmail } = require('../notifications/email.service');
      await sendCapacityAlertEmail({
        to:          tenantRow.owner_email,
        tenantName:  tenantRow.tenant_name,
        routerName:  router.name,
        siteName:    tenantRow.site_name,
        curUsers,
        maxUsers,
        pct:         Math.round(pct * 100),
      }).catch(err => console.error('[Capacity] email error:', err.message));
    }

    console.log(`[Capacity] Alert sent for ${router.name}: ${curUsers}/${maxUsers} (${Math.round(pct*100)}%)`);
  } catch (err) {
    console.error('[Capacity] alert error:', err.message);
  }
}

async function sweepOfflineRouters(db) {
  const rows = await db.query(`
    UPDATE routers SET vpn_connected = false, status = 'offline'
    WHERE vpn_connected = true
      AND last_heartbeat_at < NOW() - ($1 || ' seconds')::INTERVAL
    RETURNING id, name
  `, [HEARTBEAT_TIMEOUT_SECONDS]);
  if (rows.length) {
    console.log(`[VPN] Marked ${rows.length} router(s) offline: ${rows.map(r => r.name).join(', ')}`);
  }
  return rows;
}

// ── Comprehensive MikroTik script generator ───────────────────────────────────
function generateMikrotikScript({ router, config, platformSettings, model, tier, tenantName }) {
  const {
    wan_interface   = 'ether1',
    lan_interface   = 'ether2',
    dns_servers     = '8.8.8.8,8.8.4.4',
    gateway,
    pool_start,
    pool_end,
    network_cidr,
  } = config;

  const gw          = gateway      || tier?.gateway    || '192.168.1.1';
  const netCidr     = network_cidr || tier?.subnet     || '192.168.1.0/24';
  const prefix      = netCidr.split('/')[1] || '24';
  const networkBase = netCidr.split('/')[0];
  const poolS       = pool_start   || tier?.poolStart  || '192.168.1.2';
  const poolE       = pool_end     || tier?.poolEnd    || '192.168.1.254';

  const serverIp     = platformSettings.icube_server_ip     || 'web.icubeug.net';
  const portalDomain = platformSettings.icube_portal_domain || 'web.icubeug.net';
  const wgPrivKey    = router.wireguard_private_key;
  const wgPeerIp     = router.wireguard_peer_ip;
  const wgServerPub  = process.env.WG_SERVER_PUBLIC_KEY || '<WG_SERVER_PUBLIC_KEY>';
  const tenantSlug   = router.tenant_slug || 'default';
  const vpnPort      = router.vpn_port || 51820;
  const isL009       = model?.is_l009 || false;
  const modelName    = model?.name    || 'Custom';
  const timestamp    = new Date().toISOString();
  const tenant       = tenantName || 'iCube ISP';
  const apiUserScript = router.api_username && router.api_password
    ? `:if ([/user print count-only where name="${router.api_username}"] = 0) do={ /user add name="${router.api_username}" password="${router.api_password}" group=full comment="iCube API user" disabled=no } else={ /user set [find name="${router.api_username}"] password="${router.api_password}" group=full disabled=no }`
    : '# API credentials not stored for this router; add credentials in iCube before live management.';

  return `# iCube Platform — MikroTik Setup Script
# Router:    ${router.name}
# Model:     ${modelName}
# Tenant:    ${tenant}
# Generated: ${timestamp}
:local icubeApiHost "${serverIp}"
:local icubeApiIp ""
:do { :set icubeApiIp [:resolve $icubeApiHost] } on-error={ :log error ("iCube could not resolve " . $icubeApiHost); :error ("iCube DNS resolve failed for " . $icubeApiHost) }
:local icubeApiCidr ($icubeApiIp . "/32")
/system identity set name="${router.name}"
/system clock set time-zone-name=Africa/Kampala
/system ntp client set enabled=yes server-dns-name=time.google.com
/ip address add address=${gw}/${prefix} interface=${lan_interface} comment="iCube LAN"
/ip pool add name=icube-hotspot-pool ranges=${poolS}-${poolE}
/ip dhcp-server add name=icube-dhcp interface=${lan_interface} address-pool=icube-hotspot-pool lease-time=1h disabled=no
/ip dhcp-server network add address=${networkBase}/${prefix} gateway=${gw} dns-server=${dns_servers}
/ip dns set servers=${dns_servers} allow-remote-requests=yes
/ip firewall nat add chain=srcnat out-interface=${wan_interface} action=masquerade comment="iCube NAT"
:do { /radius remove [find comment="iCube RADIUS"] } on-error={}
/radius add service=hotspot,login address=$icubeApiIp secret="${router.radius_secret || 'MISSING'}" authentication-port=1812 accounting-port=1813 timeout=3s comment="iCube RADIUS"
:do { /radius incoming set accept=yes port=3799 } on-error={ :log warning "iCube could not enable RADIUS incoming CoA on this RouterOS version" }
${wgPrivKey ? `:local rosver [/system resource get version]
:local rosMajor [:tonum [:pick $rosver 0 [:find $rosver "."]]]
:if ($rosMajor >= 7) do={
  /interface wireguard add name=icube-vpn private-key="${wgPrivKey}" listen-port=13231 comment="iCube WireGuard VPN"
  /interface wireguard peers add interface=icube-vpn public-key="${wgServerPub}" endpoint-address=vpn.icubeug.net endpoint-port=${vpnPort} allowed-address=("10.99.0.0/24," . $icubeApiCidr) persistent-keepalive=25
  /ip address add address=${wgPeerIp}/24 interface=icube-vpn comment="iCube VPN IP"
  /ip route add dst-address=$icubeApiCidr gateway=icube-vpn comment="iCube Server Route"
} else={
  :log warning ("iCube WireGuard skipped: RouterOS " . $rosver . " does not support /interface wireguard. Upgrade to RouterOS v7 for VPN remote access.")
}` : '# WireGuard not provisioned yet'}
${isL009 ? '/interface ethernet set [find] l2mtu=1598\n/interface bridge set [find] fast-forward=yes' : ''}
/ip service set api address=$icubeApiCidr disabled=no port=8728
${apiUserScript}
/ip service disable telnet,ftp,www,ssh
:log info "iCube setup complete for ${router.name}"
`;
}

module.exports = { handleHeartbeat, sweepOfflineRouters, generateMikrotikScript };
