// src/vpn/wireguard.service.js
// WireGuard peer management — generates keys, assigns IPs, writes peer configs,
// and builds the MikroTik CLI snippet for each router.

const { execSync, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');

const WG_CONFIG_DIR    = process.env.WG_CONFIG_DIR || '/config/wireguard';
const SERVER_PUBLIC_KEY = process.env.WG_SERVER_PUBLIC_KEY || '';
const SERVER_URL        = process.env.WG_SERVER_URL || 'web.icubeug.net';
const SERVER_PORT       = parseInt(process.env.WG_SERVER_PORT || '51820', 10);
const VPN_SUBNET        = '10.99.0';   // peers get 10.99.0.2, 10.99.0.3 …
const VPN_SUBNET_CIDR   = '10.99.0.0/24';
const SERVER_VPN_IP     = '10.99.0.1';

// ── Key generation ────────────────────────────────────────────────────────────

function generateKeyPair() {
  try {
    const privateKey = execSync('wg genkey', { encoding: 'utf8' }).trim();
    const publicKey  = execSync(`echo "${privateKey}" | wg pubkey`, { encoding: 'utf8' }).trim();
    return { privateKey, publicKey };
  } catch {
    // Fallback: generate random base64 keys (dev / non-Linux environment)
    const buf = () => require('crypto').randomBytes(32).toString('base64');
    const privateKey = buf();
    const publicKey  = buf();
    return { privateKey, publicKey };
  }
}

// ── IP allocation — find next free peer index ─────────────────────────────────

async function allocatePeerIP(db) {
  const rows = await db.query(
    `SELECT wireguard_peer_index FROM routers WHERE wireguard_peer_index IS NOT NULL ORDER BY wireguard_peer_index ASC`
  );
  const used = new Set(rows.map(r => r.wireguard_peer_index));
  let index = 2; // start at .2 (.1 is the server)
  while (used.has(index)) index++;
  return { index, ip: `${VPN_SUBNET}.${index}` };
}

// ── Write peer config file ────────────────────────────────────────────────────

function writePeerConfig(routerId, peerConfig) {
  try {
    const dir = path.join(WG_CONFIG_DIR, 'peers', `router-${routerId}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'peer.conf'), peerConfig, { mode: 0o600 });
  } catch (err) {
    console.warn('[WireGuard] Could not write peer config file:', err.message);
  }
}

// ── Reload WireGuard to add/update a peer ────────────────────────────────────

function reloadPeer(publicKey, peerIp) {
  try {
    execSync(`wg set wg0 peer "${publicKey}" allowed-ips ${peerIp}/32`);
  } catch (err) {
    console.warn('[WireGuard] wg set failed (may not be running locally):', err.message);
  }
}

// ── Generate WireGuard peer config (INI format) ───────────────────────────────

function buildPeerConf({ privateKey, peerIp }) {
  return `[Interface]
PrivateKey = ${privateKey}
Address    = ${peerIp}/24
DNS        = 8.8.8.8

[Peer]
PublicKey  = ${SERVER_PUBLIC_KEY || '<SERVER_PUBLIC_KEY>'}
Endpoint   = ${SERVER_URL}:${SERVER_PORT}
AllowedIPs = ${VPN_SUBNET_CIDR}, ${SERVER_URL}/32
PersistentKeepalive = 25
`;
}

// ── Generate the MikroTik WireGuard CLI commands ──────────────────────────────

function buildMikrotikWireguardScript({ routerName, privateKey, peerIp }) {
  return `
# ================================================================
# WireGuard VPN — ${routerName}
# ================================================================
/interface wireguard add name=icube-vpn \\
  private-key="${privateKey}" \\
  listen-port=13231 \\
  comment="iCube WireGuard VPN"

/interface wireguard peers add \\
  interface=icube-vpn \\
  public-key="${SERVER_PUBLIC_KEY || '<SERVER_PUBLIC_KEY>'}" \\
  endpoint-address=${SERVER_URL} \\
  endpoint-port=${SERVER_PORT} \\
  allowed-address=${VPN_SUBNET_CIDR} \\
  persistent-keepalive=25 \\
  comment="iCube server"

/ip address add address=${peerIp}/24 interface=icube-vpn comment="iCube VPN IP"
/ip route add dst-address=${SERVER_URL}/32 gateway=${peerIp} distance=1 comment="iCube server"
/ip route add dst-address=${SERVER_VPN_IP}/32 gateway=icube-vpn comment="iCube RADIUS via VPN"
`;
}

// ── Main: provision WireGuard peer for a newly added router ──────────────────

async function provisionRouterPeer(db, routerId) {
  const rRows = await db.query(`SELECT * FROM routers WHERE id = $1`, [routerId]);
  if (!rRows.length) throw new Error('Router not found: ' + routerId);
  const router = rRows[0];

  // Already provisioned
  if (router.wireguard_public_key) {
    return {
      peerIp:     router.wireguard_peer_ip,
      publicKey:  router.wireguard_public_key,
      privateKey: router.wireguard_private_key,
      config:     router.wireguard_config,
    };
  }

  const { privateKey, publicKey } = generateKeyPair();
  const { index, ip: peerIp }     = await allocatePeerIP(db);

  const peerConf      = buildPeerConf({ privateKey, peerIp });
  const mikrotikScript = buildMikrotikWireguardScript({
    routerName: router.name, privateKey, peerIp,
  });

  // Persist in DB
  await db.query(`
    UPDATE routers SET
      wireguard_private_key = $1,
      wireguard_public_key  = $2,
      wireguard_peer_ip     = $3,
      wireguard_config      = $4,
      wireguard_peer_index  = $5
    WHERE id = $6
  `, [privateKey, publicKey, peerIp, peerConf, index, routerId]);

  // Write peer config file and hot-reload WireGuard interface
  writePeerConfig(routerId, peerConf);
  reloadPeer(publicKey, peerIp);

  console.log(`[WireGuard] Provisioned peer for ${router.name}: ${peerIp}`);
  return { peerIp, publicKey, privateKey, config: peerConf, mikrotikScript };
}

// ── VPN status — parse `wg show wg0` output ──────────────────────────────────

async function getVpnStatus(publicKey) {
  return new Promise(resolve => {
    exec('wg show wg0', (err, stdout) => {
      if (err) return resolve({ connected: false });

      const peers = stdout.split('\npeer:');
      for (const peer of peers) {
        if (!peer.includes(publicKey)) continue;

        const handshakeMatch = peer.match(/latest handshake: (.+)/);
        const transferMatch  = peer.match(/transfer: ([\d.]+ \w+) received, ([\d.]+ \w+) sent/);
        const endpointMatch  = peer.match(/endpoint: (.+)/);

        const lastHandshake = handshakeMatch?.[1]?.trim();
        const connected     = !!lastHandshake && !lastHandshake.includes('never');

        resolve({
          connected,
          last_handshake: lastHandshake || null,
          bytes_in:  transferMatch?.[1] || null,
          bytes_out: transferMatch?.[2] || null,
          endpoint:  endpointMatch?.[1] || null,
        });
        return;
      }
      resolve({ connected: false });
    });
  });
}

module.exports = {
  provisionRouterPeer,
  buildMikrotikWireguardScript,
  getVpnStatus,
  SERVER_VPN_IP,
  VPN_SUBNET_CIDR,
};
