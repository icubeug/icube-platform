// src/routers/router-intelligence.js — Tier detection + zero-touch script generation

const ROUTER_TIERS = {
  tier1: {
    models: ['RB941','hAP lite','RB931','hAP mini','RB951','hAP','RB952','hAP ac lite','RB750','hEX lite','hEX S'],
    subnet_prefix: 24, subnet_mask: '255.255.255.0',
    network: '192.168.1.0', gateway: '192.168.1.1',
    pool_start: '192.168.1.2', pool_end: '192.168.1.254',
    max_users: 200, recommended_users: 150, tier_name: 'SOHO',
    legacy_vpn: true, // ROS v6 common on these models
  },
  tier2: {
    models: ['hAP ac','RB962','RBD53','RB2011','mAP','cAP','RB951G'],
    subnet_prefix: 23, subnet_mask: '255.255.254.0',
    network: '10.10.0.0', gateway: '10.10.0.1',
    pool_start: '10.10.0.2', pool_end: '10.10.1.254',
    max_users: 400, recommended_users: 300, tier_name: 'Medium',
    legacy_vpn: true, // ROS v6 possible on these models
  },
  tier3: {
    models: ['RB3011','RB4011','L009','RB1100','CCR1009'],
    subnet_prefix: 21, subnet_mask: '255.255.248.0',
    network: '10.10.0.0', gateway: '10.10.0.1',
    pool_start: '10.10.0.2', pool_end: '10.10.7.254',
    max_users: 1600, recommended_users: 1200, tier_name: 'Large',
    special: 'l009_hardware_offload',
  },
  tier4: {
    models: ['CCR1016','CCR1036','CCR1072','CCR2004','CCR2116'],
    subnet_prefix: 19, subnet_mask: '255.255.224.0',
    network: '10.10.0.0', gateway: '10.10.0.1',
    pool_start: '10.10.0.2', pool_end: '10.10.31.254',
    max_users: 6000, recommended_users: 5000, tier_name: 'Enterprise',
  },
  tier5: {
    models: ['CCR2216'],
    subnet_prefix: 18, subnet_mask: '255.255.192.0',
    network: '10.10.0.0', gateway: '10.10.0.1',
    pool_start: '10.10.0.2', pool_end: '10.10.63.254',
    max_users: 12000, recommended_users: 10000, tier_name: 'Carrier',
  },
};

function detectRouterTier(model) {
  if (!model) return ROUTER_TIERS.tier1;
  const m = model.toLowerCase();
  for (const tier of Object.values(ROUTER_TIERS)) {
    if (tier.models.some(name => m.includes(name.toLowerCase()))) return tier;
  }
  return ROUTER_TIERS.tier1;
}

function generateZeroTouchScript({
  routerName, routerToken, model, vpnPort, privateKey, serverPublicKey,
  peerIp, radiusSecret, tier, tenantSlug,
  vpnType = 'wireguard', // 'wireguard' | 'l2tp'
  vpnUsername = '', vpnPassword = '', ipsecSecret = 'icube-ipsec-2024',
}) {
  const SERVER_IP = '139.84.247.205';
  const t         = tier || ROUTER_TIERS.tier1;
  const isL009    = model && /L009/i.test(model);
  const useL2TP   = vpnType === 'l2tp';

  // ── RouterOS version check block ──────────────────────────────────────────
  const rosVersionCheck = `# ============================================
# ROUTEROS VERSION CHECK
# ============================================
:local rosver [/system resource get version]
:log info "RouterOS version: \$rosver"
:if ([:pick \$rosver 0 1] < "7") do={
  :log warning "RouterOS v7+ recommended for WireGuard. Current: \$rosver"
  :log warning "If WireGuard fails, re-run with L2TP/IPsec mode."
}`;

  // ── WireGuard availability guard ─────────────────────────────────────────
  const wgAvailabilityCheck = `
# ============================================
# ENABLE WIREGUARD PACKAGE (if not installed)
# ============================================
/system package update check-for-updates
:if ([/interface wireguard print count-only] = 0) do={
  :log info "WireGuard not available — please update RouterOS to v7+"
}`;

  // ── VPN section ───────────────────────────────────────────────────────────
  const vpnSection = useL2TP ? `
# ── L2TP/IPsec VPN (RouterOS v6 compatible) ───────────────────
/interface l2tp-client add name=icube-vpn \\
  connect-to=vpn.icubeug.net \\
  user="${vpnUsername}" \\
  password="${vpnPassword}" \\
  ipsec-secret="${ipsecSecret}" \\
  use-ipsec=yes \\
  disabled=no \\
  comment="iCube VPN"
/ip route add dst-address=${SERVER_IP}/32 gateway=icube-vpn comment="iCube Server Route"` : `
# ── WireGuard VPN (RouterOS v7+) ───────────────────────────────
${wgAvailabilityCheck}
/interface wireguard add name=icube-vpn private-key="${privateKey}" listen-port=13231 comment="iCube VPN"
/interface wireguard peers add interface=icube-vpn public-key="${serverPublicKey}" endpoint-address=vpn.icubeug.net endpoint-port=${vpnPort} allowed-address=10.99.0.0/24,${SERVER_IP}/32 persistent-keepalive=25 comment="iCube Server"
/ip address add address=${peerIp}/24 interface=icube-vpn comment="iCube VPN IP"
/ip route add dst-address=${SERVER_IP}/32 gateway=${peerIp} comment="iCube Server Route"`;

  return `# ================================================================
# iCube Router Setup — ${routerName}
# Model: ${model || 'Unknown'}  Tier: ${t.tier_name}  Max users: ${t.max_users}
# VPN:   ${useL2TP ? 'L2TP/IPsec (RouterOS v6)' : `WireGuard port ${vpnPort} (RouterOS v7+)`}
# ================================================================

${rosVersionCheck}
/system identity set name="${routerName}"
/system clock set time-zone-name=Africa/Kampala
/system ntp client set enabled=yes server-dns-name=time.google.com
${vpnSection}

# ── LAN / DHCP ──────────────────────────────────────────────────
/ip pool add name=icube-pool ranges=${t.pool_start}-${t.pool_end}
/ip dhcp-server add name=icube-dhcp interface=bridge address-pool=icube-pool lease-time=1h disabled=no
/ip dhcp-server network add address=${t.network}/${t.subnet_prefix} gateway=${t.gateway} dns-server=8.8.8.8,8.8.4.4
/ip address add address=${t.gateway}/${t.subnet_prefix} interface=bridge comment="iCube LAN"
/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="iCube NAT"

# ── RADIUS ─────────────────────────────────────────────────────
/radius add service=hotspot,login address=${SERVER_IP} secret="${radiusSecret}" authentication-port=1812 accounting-port=1813 timeout=3000 comment="iCube RADIUS"
/radius incoming add accept=yes port=3799

# ── API & Security ─────────────────────────────────────────────
/ip service set api address=10.99.0.0/24,${SERVER_IP}/32 disabled=no port=8728
/ip service disable telnet,ftp,www,ssh
${isL009 ? `
# ── L009 Hardware Offloading ───────────────────────────────────
/interface ethernet set [find] l2mtu=1598
/interface bridge set [find] fast-forward=yes
` : ''}
# ── Register with iCube ────────────────────────────────────────
/tool fetch url="http://${SERVER_IP}/api/v1/routers/register" http-method=post http-header-field="Content-Type: application/json" http-data="{\\\"token\\\":\\\"${routerToken}\\\",\\\"identity\\\":\\\"${routerName}\\\",\\\"model\\\":\\\"${model || ''}\\\"}" output=none

# ── Heartbeat scheduler ────────────────────────────────────────
/system scheduler add name=icube-heartbeat interval=5m on-event=":local cpu [/system resource get cpu-load];:local mem [/system resource get free-memory];:local totalmem [/system resource get total-memory];:local mempct (100*(\$totalmem-\$mem)/\$totalmem);:local users [/ip hotspot active print count-only];/tool fetch url=\\"http://${SERVER_IP}/api/v1/routers/heartbeat\\" http-method=post http-header-field=\\"Content-Type: application/json\\" http-data=\\"{\\\\\\\"token\\\\\\\":\\\\\\\"${routerToken}\\\\\\\",\\\\\\\"cpu_load\\\\\\\":\$cpu,\\\\\\\"memory_used\\\\\\\":\$mempct,\\\\\\\"active_users\\\\\\\":\$users}\\" output=none" comment="iCube heartbeat"

:log info "iCube setup complete for ${routerName} — tenant ${tenantSlug}"
`;
}

module.exports = { detectRouterTier, ROUTER_TIERS, generateZeroTouchScript };
