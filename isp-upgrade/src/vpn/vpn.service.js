// src/vpn/vpn.service.js — VPN heartbeat + MikroTik script generation

const HEARTBEAT_TIMEOUT_SECONDS = 120;

async function handleHeartbeat(db, { vpn_username, vpn_ip, stats = {} }) {
  if (!vpn_username) throw new Error('vpn_username required');
  const rows = await db.query(`
    UPDATE routers
    SET vpn_connected = true,
        vpn_ip = COALESCE($2, vpn_ip),
        last_heartbeat_at = NOW()
    WHERE vpn_username = $1
    RETURNING id, tenant_id, name, vpn_username, vpn_ip, vpn_connected
  `, [vpn_username, vpn_ip || null]);
  if (!rows.length) throw new Error('Router not found for vpn_username: ' + vpn_username);
  const router = rows[0];
  if (stats.connected_users != null || stats.cpu_load != null) {
    await db.query(`
      INSERT INTO router_metrics
        (router_id, tenant_id, connected_users, cpu_load, memory_used_mb,
         rx_bytes_sec, tx_bytes_sec, uptime_seconds, recorded_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
    `, [
      router.id, router.tenant_id,
      stats.connected_users || 0, stats.cpu_load || 0, stats.memory_used_mb || 0,
      stats.rx_bytes_sec || 0, stats.tx_bytes_sec || 0, stats.uptime_seconds || 0,
    ]).catch(() => {});
  }
  return router;
}

async function sweepOfflineRouters(db) {
  const rows = await db.query(`
    UPDATE routers SET vpn_connected = false
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
    network_mask,
  } = config;

  // Network values — from tier or config overrides
  const gw         = gateway      || tier?.gateway    || '192.168.1.1';
  const netCidr     = network_cidr || tier?.subnet     || '192.168.1.0/24';
  const prefix      = netCidr.split('/')[1] || '24';
  const networkBase = netCidr.split('/')[0];
  const poolS       = pool_start   || tier?.poolStart  || '192.168.1.2';
  const poolE       = pool_end     || tier?.poolEnd    || '192.168.1.254';

  const vpnServer    = platformSettings.icube_vpn_server    || 'vpn.icube.co.ug';
  const radiusIp     = platformSettings.icube_radius_ip     || '10.0.0.1';
  const serverIp     = platformSettings.icube_server_ip     || '41.210.0.1';
  const portalDomain = platformSettings.icube_portal_domain || 'portal.icube.co.ug';
  const ipsecSecret  = platformSettings.icube_vpn_ipsec_secret || 'icube-ipsec-2024';

  const dnsArr       = dns_servers.split(',').map(d => d.trim());
  const timestamp    = new Date().toISOString();
  const isL009       = model?.is_l009 || false;
  const modelName    = model?.name    || 'Custom';
  const modelSku     = model?.sku     || '';
  const tierName     = tier?.name     || 'Custom';
  const routerName   = router.name;
  const tenant       = tenantName || 'iCube ISP';

  const sep = (title) =>
    `\n# ${'='.repeat(52)}\n# ${title}\n# ${'='.repeat(52)}`;

  return `${sep('iCube Platform — MikroTik Configuration Script')}
# Router:    ${routerName}
# Model:     ${modelName}${modelSku ? ' (' + modelSku + ')' : ''}
# Tier:      ${tierName}
# Tenant:    ${tenant}
# Generated: ${timestamp}
# Support:   support@icube.co.ug
# ${'='.repeat(52)}
${sep('SECTION: SYSTEM CONFIGURATION')}
/system identity set name="${routerName}"
/system clock set time-zone-name=Africa/Kampala
/system ntp client set enabled=yes server-dns-name=time.google.com
${sep('SECTION: LAN IP ADDRESS')}
/ip address add address=${gw}/${prefix} interface=${lan_interface} comment="iCube LAN"
${sep('SECTION: DHCP SERVER CONFIGURATION')}
/ip pool add name=icube-hotspot-pool ranges=${poolS}-${poolE}
/ip dhcp-server add name=icube-dhcp interface=${lan_interface} address-pool=icube-hotspot-pool lease-time=1h disabled=no
/ip dhcp-server network add address=${networkBase}/${prefix} gateway=${gw} dns-server=${dnsArr.join(',')}
${sep('SECTION: DNS CONFIGURATION')}
/ip dns set servers=${dnsArr.join(',')} allow-remote-requests=yes
${sep('SECTION: NAT MASQUERADE')}
/ip firewall nat add chain=srcnat out-interface=${wan_interface} action=masquerade comment="iCube NAT"
${sep('SECTION: HOTSPOT CONFIGURATION')}
/ip hotspot profile add name=icube-profile \\
    hotspot-address=${gw} \\
    dns-name="${portalDomain}" \\
    use-radius=yes \\
    radius-accounting=yes \\
    login-by=http-chap,http-pap,mac-cookie \\
    mac-auth-mode=mac-as-username-and-password \\
    http-cookie-lifetime=1d \\
    trial-uptime=0s

/ip hotspot add name=icube-hotspot \\
    interface=${lan_interface} \\
    address-pool=icube-hotspot-pool \\
    profile=icube-profile \\
    idle-timeout=none \\
    keepalive-timeout=2m \\
    disabled=no
${sep('SECTION: RADIUS CONFIGURATION')}
/radius add service=hotspot,login \\
    address=${radiusIp} \\
    secret="${router.radius_secret || 'RADIUS_SECRET_MISSING'}" \\
    authentication-port=1812 \\
    accounting-port=1813 \\
    timeout=3000
/radius incoming add accept=yes port=3799
${sep('SECTION: VPN TUNNEL (L2TP/IPsec)')}
/interface l2tp-client add \\
    name=icube-vpn \\
    connect-to=${vpnServer} \\
    user="${router.vpn_username || 'VPN_USER_MISSING'}" \\
    password="${router.vpn_password || 'VPN_PASS_MISSING'}" \\
    use-ipsec=yes \\
    ipsec-secret="${ipsecSecret}" \\
    add-default-route=no \\
    disabled=no \\
    comment="iCube VPN Tunnel"

/ip route add dst-address=${serverIp}/32 gateway=${wan_interface} comment="iCube server via WAN"
/ip route add dst-address=${radiusIp}/32 gateway=icube-vpn comment="RADIUS via VPN"
${sep('SECTION: API ACCESS CONTROL')}
/ip service set api address=${serverIp}/32 disabled=no port=8728
/ip service set api-ssl disabled=yes
/ip service disable telnet,ftp,www,ssh,winbox
${sep('SECTION: FIREWALL RULES')}
/ip firewall filter add chain=input action=accept \\
    connection-state=established,related \\
    comment="Allow established/related"
/ip firewall filter add chain=input action=accept \\
    protocol=icmp \\
    comment="Allow ICMP"
/ip firewall filter add chain=input action=accept \\
    src-address=${serverIp} \\
    comment="Allow iCube management"
/ip firewall filter add chain=input action=accept \\
    in-interface=icube-vpn \\
    comment="Allow VPN traffic"
/ip firewall filter add chain=input action=drop \\
    in-interface=${wan_interface} \\
    comment="Drop WAN unsolicited input"
${sep('SECTION: WALLED GARDEN')}
/ip hotspot walled-garden add dst-host="${portalDomain}"
/ip hotspot walled-garden add dst-host="*.google.com"
/ip hotspot walled-garden ip add dst-address=${serverIp} action=accept
${sep('SECTION: HEARTBEAT SCHEDULER')}
/system scheduler add \\
    name=icube-heartbeat \\
    interval=60s \\
    on-event=":do { /tool fetch url=\\"https://${serverIp}/api/v1/routers/heartbeat\\" http-method=post http-data=\\"{\\\\\"vpn_username\\\\\":\\\\\"${router.vpn_username || ''}\\\\\"}\\" keep-result=no } on-error={}" \\
    comment="iCube heartbeat"
${isL009 ? `${sep('SECTION: L009 HARDWARE OFFLOADING')}
# NOTE: The L009 supports hardware offloading for better performance.
# These settings reduce CPU load significantly under high user counts.
/interface ethernet set [find] l2mtu=1598
/interface bridge set [find] fast-forward=yes
` : ''}
# ${'='.repeat(52)}
# iCube Configuration Complete
# Router:    ${routerName}
# Model:     ${modelName}${modelSku ? ' (' + modelSku + ')' : ''}
# Tenant:    ${tenant}
# Tier:      ${tierName}  |  Max users: ${tier?.maxUsers || 'custom'}
# Network:   ${networkBase}/${prefix}  |  Pool: ${poolS}-${poolE}
# Generated: ${timestamp}
# Support:   support@icube.co.ug
# ${'='.repeat(52)}
:log info "iCube setup complete for ${routerName}"
`;
}

module.exports = { handleHeartbeat, sweepOfflineRouters, generateMikrotikScript };
